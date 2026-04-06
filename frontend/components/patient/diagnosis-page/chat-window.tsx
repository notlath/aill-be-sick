"use client";

import { autoRecordDiagnosis } from "@/actions/auto-record-diagnosis";
import { createMessage } from "@/actions/create-message";
import { explainDiagnosis } from "@/actions/explain-diagnosis";
import { getFollowUpQuestion } from "@/actions/get-follow-up-question";
import { runDiagnosis } from "@/actions/run-diagnosis";
import { Chat, Explanation, Message } from "@/lib/generated/prisma";
import {
  CreateChatSchema,
  CreateChatSchemaType,
} from "@/schemas/CreateChatSchema";
import { Explanation as TempExplanation } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction, useOptimisticAction } from "next-safe-action/hooks";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import ChatContainer from "./chat-container";
import DiagnosisForm from "./diagnosis-form";
import ThreadTransition from "./thread-transition";

const CDSSSummary = dynamic(() => import("./cdss-summary"));

// Helpers to map backend strings to enum values expected by CreateMessageSchema
const mapModelUsed = (
  modelUsed?: string,
): "BIOCLINICAL_MODERNBERT" | "ROBERTA_TAGALOG" => {
  if (!modelUsed) return "BIOCLINICAL_MODERNBERT";
  const lower = modelUsed.toLowerCase();
  if (lower.includes("roberta") || lower.includes("tagalog"))
    return "ROBERTA_TAGALOG";
  return "BIOCLINICAL_MODERNBERT";
};

const mapDisease = (
  disease?: string,
):
  | "DENGUE"
  | "PNEUMONIA"
  | "TYPHOID"
  | "DIARRHEA"
  | "MEASLES"
  | "INFLUENZA" => {
  switch ((disease || "").toLowerCase()) {
    case "dengue":
      return "DENGUE";
    case "pneumonia":
      return "PNEUMONIA";
    case "typhoid":
      return "TYPHOID";
    case "diarrhea":
      return "DIARRHEA";
    case "measles":
      return "MEASLES";
    case "influenza":
      return "INFLUENZA";
    default:
      return "PNEUMONIA";
  }
};

/** Safely coerce a message field to a string.
 * The backend may return `message` as a `{en, tl}` dict (UNRELATED_CATEGORY path).
 */
const resolveMessage = (msg: unknown): string | null => {
  if (typeof msg === "string" && msg.trim().length > 0) return msg;
  if (msg && typeof msg === "object") {
    const obj = msg as Record<string, string>;
    const str = obj["en"] ?? obj["tl"] ?? Object.values(obj)[0];
    if (typeof str === "string" && str.trim().length > 0) return str;
  }
  return null;
};

const getOutOfScopeMessage = ({
  reason,
  diagnosis,
  verificationFailure,
}: {
  reason?: string;
  diagnosis?: any;
  verificationFailure?: any;
}) => {
  const resolved =
    resolveMessage(diagnosis?.message) ??
    resolveMessage(verificationFailure?.message);
  if (resolved) return resolved;

  const outOfScopeType = diagnosis?.out_of_scope_type;

  if (outOfScopeType === "CONFLICTING_MATCH") {
    return "Your symptoms partially match the suggested condition, but some of what you described does not fully fit it. Because of this mismatch, this result is not reliable enough to confirm. Please consult a healthcare professional for a proper evaluation.";
  }

  if (reason === "OUT_OF_SCOPE" || reason === "SYMPTOMS_NOT_MATCHING") {
    return "Your symptoms do not clearly match the diseases this system currently covers. Please consult a healthcare professional for a proper evaluation.";
  }

  return "Your symptoms may not match the diseases this system covers. Please consult a healthcare professional.";
};

type ChatWindowProps = {
  chatId: string;
  messages: (Message & { explanation?: Explanation | null })[];
  chat: Chat;
  dbExplanation: Explanation | null;
  userRole?: string;
  needsRecovery?: boolean;
};

const ChatWindow = ({
  chatId,
  messages,
  chat,
  dbExplanation,
  userRole,
  needsRecovery,
}: ChatWindowProps) => {
  const form = useForm<CreateChatSchemaType>({
    resolver: zodResolver(CreateChatSchema),
    defaultValues: {
      chatId,
      symptoms: "",
    },
  });

  const [currentQuestion, setCurrentQuestion] = useState<{
    id: string;
    question: string;
    positive_symptom: string;
    negative_symptom: string;
  } | null>(null);
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
  const [confirmNeeded, setConfirmNeeded] = useState<boolean>(false);

  // ── SESSION-BACKED STATE ──────────────────────────────────────────
  // The DB session_id is the primary state carrier.
  // The frontend only holds this ID; all probs/evidence live server-side.
  const [diagnosisSessionId, setDiagnosisSessionId] = useState<string | null>(
    null,
  );

  const prevChatIdRef = useRef<string>(chatId);
  const explanationRequestedRef = useRef<Set<string>>(new Set());
  const lastExplanationMessageIdRef = useRef<number | null>(null);
  const diagnosisRequestedRef = useRef<Set<string>>(new Set());
  const followUpPendingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Guards against duplicate DIAGNOSIS messages from concurrent follow-up responses.
  // Keep separate in-flight and created states so failed writes can still retry.
  const finalDiagnosisInFlightRef = useRef<boolean>(false);
  const finalDiagnosisCreatedRef = useRef<boolean>(false);

  const lastDiagnosisRef = useRef<any>(null);
  const initialSymptomsRef = useRef<string>("");
  // Mount guard: prevents onSuccess callbacks from firing after unmount
  const isMountedRef = useRef<boolean>(true);

  const getCurrentSymptoms = () => {
    return (
      initialSymptomsRef.current ||
      messages.find((m) => m.type === "SYMPTOMS" && m.role === "USER")
        ?.content ||
      lastDiagnosisRef.current?.symptoms ||
      form.getValues("symptoms")
    ).toString();
  };

  const [currentDiagnosis, setCurrentDiagnosis] = useState<{
    disease: string;
    confidence: number;
    uncertainty: number;
    top_diseases?: any[];
    cdss?: any;
    model_used?: string;
    mean_probs?: any[];
    is_valid?: boolean;
  } | null>(null);
  const [isFinalDiagnosis, setIsFinalDiagnosis] = useState<boolean>(false);

  const { execute: getFollowUpExecute, isExecuting: isGettingQuestion } =
    useAction(getFollowUpQuestion, {
      onSuccess: ({ data }) => {
        // Guard: ignore callbacks after unmount to prevent stale state updates
        if (!isMountedRef.current) return;
        if (data?.success) {
          const { question, should_stop, reason, diagnosis, session_id } =
            data.success as any;

          // ── Capture session_id from backend ──
          if (session_id) {
            setDiagnosisSessionId(session_id);
          }

          if (diagnosis) {
            const {
              disease,
              confidence,
              uncertainty,
              top_diseases,
              cdss,
              model_used,
              mean_probs,
              is_valid,
            } = diagnosis;
            setCurrentDiagnosis({
              disease,
              confidence,
              uncertainty,
              top_diseases,
              cdss,
              model_used,
              mean_probs,
              is_valid,
            });
            lastDiagnosisRef.current = {
              ...(lastDiagnosisRef.current || {}),
              ...diagnosis,
              // Preserve mean_probs from the initial diagnosis if the follow-up
              // response doesn't include it — mean_probs is required for SHAP.
              mean_probs:
                diagnosis.mean_probs ?? lastDiagnosisRef.current?.mean_probs,
              symptoms: getCurrentSymptoms(),
            };
          }

          // Handle cases where symptoms don't match or diagnosis is out of scope
          // These are hard failures - no CDSS should be shown
          if (reason === "SYMPTOMS_NOT_MATCHING" || reason === "OUT_OF_SCOPE") {
            setIsFinalDiagnosis(false);
            const outOfScopeMessage = getOutOfScopeMessage({
              reason,
              diagnosis,
              verificationFailure: diagnosis?.verification_failure,
            });
            createMessageExecute({
              chatId,
              content: outOfScopeMessage,
              type: "INFO",
              role: "AI",
            });
            setCurrentQuestion(null);
            return;
          }

          // Handle low confidence / unable to diagnose cases
          // Still show CDSS with triage guidance, but mark as informational
          if (diagnosis?.is_valid === false) {
            setIsFinalDiagnosis(true);
            const { disease, confidence, uncertainty, model_used } = diagnosis;

            // Use the message from backend (already formatted for uncertain cases)
            const summary =
              diagnosis.message ||
              "Based on the information provided, we could not identify a specific condition with enough certainty. Please consult a healthcare provider for a proper evaluation.";

            createMessageExecute({
              chatId,
              content: summary,
              type: "INFO",
              role: "AI",
              tempDiagnosis: {
                confidence,
                uncertainty,
                modelUsed: mapModelUsed(model_used),
                disease: mapDisease(disease),
                symptoms: getCurrentSymptoms(),
                cdss: diagnosis?.cdss ?? undefined,
                is_valid: false,
              },
            });
            setCurrentQuestion(null);
            return;
          }

          // Standard final diagnosis flow (is_valid === true)
          if (should_stop && !question) {
            setIsFinalDiagnosis(true);
            if (diagnosis && !finalDiagnosisCreatedRef.current) {
              if (finalDiagnosisInFlightRef.current) {
                setCurrentQuestion(null);
                return;
              }
              finalDiagnosisInFlightRef.current = true;
              const { disease, confidence, uncertainty, model_used } =
                diagnosis;
              const isHighConfidence = (confidence ?? 0) >= 0.95;

              const summary = isHighConfidence
                ? `Based on the reported symptoms, **${disease}** is the closest match.`
                : diagnosis.message ||
                  `Based on the reported symptoms, **${disease}** may be a possible match. A healthcare provider should evaluate these findings.`;

              createMessageExecute({
                chatId,
                content: summary,
                type: "DIAGNOSIS",
                role: "AI",
                tempDiagnosis: {
                  confidence,
                  uncertainty,
                  modelUsed: mapModelUsed(model_used),
                  disease: mapDisease(disease),
                  symptoms: getCurrentSymptoms(),
                  cdss: diagnosis?.cdss ?? undefined,
                },
              });
            }
            setCurrentQuestion(null);
            return;
          }

          if (question) {
            setIsFinalDiagnosis(false);
            const aiContent = question.question;

            createMessageExecute({
              chatId,
              content: aiContent,
              type: "QUESTION",
              role: "AI",
            });

            setCurrentQuestion({
              id: question.id,
              question: question.question,
              positive_symptom: question.positive_symptom,
              negative_symptom: question.negative_symptom,
            });
          } else {
            setCurrentQuestion(null);
          }
        } else if (data?.error) {
          console.error("Error getting follow-up question:", data.error);
          createMessageExecute({
            chatId,
            content:
              "I could not fetch the next follow-up question. Please try submitting your symptoms again.",
            type: "ERROR",
            role: "AI",
          });
          setCurrentQuestion(null);
        }
      },
    });

  // Store explanations fetched for each message ID
  const [messageExplanations, setMessageExplanations] = useState<
    Record<number, Explanation>
  >({});

  const { execute: autoRecordExecute } = useAction(autoRecordDiagnosis, {
    onSuccess: ({ data }) => {
      // Guard: ignore callbacks after unmount
      if (!isMountedRef.current) return;
      if (data?.success) {
        // All diagnoses are now auto-recorded successfully
        console.log("[ChatWindow] Diagnosis auto-recorded:", data.success);
      } else if (data?.error) {
        console.error("[ChatWindow] Auto-record error:", data.error);
      }
    },
    onError: ({ error }) => {
      // Guard: ignore callbacks after unmount
      if (!isMountedRef.current) return;
      console.error("[ChatWindow] Auto-record request failed:", error);
    },
  });

  const { execute: getExplanations, isExecuting: isGettingExplanations } =
    useAction(explainDiagnosis, {
      onSuccess: ({ data }) => {
        // Guard: ignore callbacks after unmount
        if (!isMountedRef.current) return;
        if (data?.success && data.explanation) {
          const messageId = lastExplanationMessageIdRef.current;
          if (messageId !== null) {
            setMessageExplanations((prev) => ({
              ...prev,
              [messageId]: {
                tokens: data.explanation.tokens,
                importances: data.explanation.importances,
              } as Explanation,
            }));
            console.log(
              "[ChatWindow] Explanation stored for message",
              messageId,
            );

            // Auto-record the diagnosis now that an explanation exists.
            // All diagnoses are auto-recorded regardless of confidence level.
            // This resolves the limbo state where the chat has a final AI
            // diagnosis but no permanent Diagnosis record (e.g. after refresh).
            if (!chat.hasDiagnosis) {
              autoRecordExecute({
                messageId,
                chatId,
              });
            }
          } else {
            console.warn(
              "[ChatWindow] Explanation received but messageId is null",
            );
          }
        } else if (data?.error) {
          console.error(
            "[ChatWindow] Explanation error:",
            data.error,
            data.message,
          );
        } else {
          console.warn(
            "[ChatWindow] Explanation response missing success/explanation",
            data,
          );
        }
      },
      onError: ({ error }) => {
        // Guard: ignore callbacks after unmount
        if (!isMountedRef.current) return;
        console.error("[ChatWindow] Explanation request failed:", error);
      },
    });

  const { execute: runDiagnosisExecute, isExecuting: isDiagnosing } = useAction(
    runDiagnosis,
    {
      onSuccess: ({ data }) => {
        // Guard: ignore callbacks after unmount to prevent stale state updates
        if (!isMountedRef.current) return;
        if (data?.error) {
          let errorMessage = "";

          if (data.error === "UNSUPPORTED_LANGUAGE") {
            errorMessage = `Sorry, I detected that you're using a different language, which is not currently supported. Please describe your symptoms in **English** or **Filipino**.`;
          } else if (data.error === "INTERNAL_ERROR") {
            errorMessage =
              data.message ||
              "An internal diagnosis error occurred. Please try again.";
          } else if (data.error === "DIAGNOSIS_TIMEOUT") {
            errorMessage =
              data.message ||
              "Diagnosis is taking too long. Please try again with a shorter symptom summary.";
          } else if (data.error === "INSUFFICIENT_SYMPTOM_EVIDENCE") {
            errorMessage =
              data.message ||
              "Please describe your symptoms in more detail so I can help diagnose you properly.";
          } else {
            errorMessage =
              data.message ||
              "An error occurred while processing your symptoms. Please try again.";
          }

          createMessageExecute({
            chatId,
            content: errorMessage,
            type: "ERROR",
            role: "AI",
          });
          hasRunInitialDiagnosis.current = false;
        } else if (data?.success && data?.diagnosis) {
          const {
            disease,
            confidence,
            uncertainty,
            top_diseases,
            cdss,
            model_used,
            mean_probs,
            is_valid,
            session_id: newSessionId,
          } = data.diagnosis as any;

          // ── Capture session_id from initial diagnosis ──
          if (newSessionId) {
            setDiagnosisSessionId(newSessionId);
          }

          setCurrentDiagnosis({
            disease,
            confidence,
            uncertainty,
            top_diseases,
            cdss,
            model_used,
            mean_probs,
            is_valid,
          });
          lastDiagnosisRef.current = {
            ...data.diagnosis,
            symptoms: getCurrentSymptoms() || data.diagnosis.symptoms,
          };

          const shouldSkipFollowup =
            (data.diagnosis as any)?.skip_followup === true;

          if (shouldSkipFollowup) {
            const skipReason = (data.diagnosis as any)?.skip_reason;

            if (
              skipReason === "OUT_OF_SCOPE" ||
              skipReason === "UNRELATED_CATEGORY"
            ) {
              setIsFinalDiagnosis(false);
              const verificationFailure = (data.diagnosis as any)
                ?.verification_failure;
              const infoMsg = getOutOfScopeMessage({
                reason: skipReason,
                diagnosis: data.diagnosis,
                verificationFailure,
              });

              createMessageExecute({
                chatId,
                content: infoMsg,
                type: "INFO",
                role: "AI",
              });
              setCurrentQuestion(null);
              return;
            }

            setIsFinalDiagnosis(true);

            if (!finalDiagnosisCreatedRef.current) {
              if (finalDiagnosisInFlightRef.current) {
                setCurrentQuestion(null);
                return;
              }
              finalDiagnosisInFlightRef.current = true;
              const isHighConfidence = (confidence ?? 0) >= 0.95;
              const summary = isHighConfidence
                ? `Based on the reported symptoms, **${disease}** is the closest match.`
                : (data.diagnosis as any)?.message ||
                  `Based on the reported symptoms, **${disease}** may be a possible match. A healthcare provider should evaluate these findings.`;

              createMessageExecute({
                chatId,
                content: summary,
                type: "DIAGNOSIS",
                role: "AI",
                tempDiagnosis: {
                  confidence,
                  uncertainty,
                  modelUsed: mapModelUsed(model_used),
                  disease: mapDisease(disease),
                  symptoms: getCurrentSymptoms(),
                  cdss: (data.diagnosis as any)?.cdss ?? undefined,
                },
              });
            }
            setCurrentQuestion(null);
          } else if (!data.isConfident) {
            // ── Simplified: pass session_id instead of thick state ──
            setIsFinalDiagnosis(false);
            getFollowUpExecute({
              session_id: newSessionId || diagnosisSessionId || undefined,
              disease,
              confidence,
              uncertainty,
              asked_questions: askedQuestions,
              symptoms: getCurrentSymptoms(),
              top_diseases: top_diseases || [],
              current_probs: mean_probs || undefined,
            });
          } else {
            setIsFinalDiagnosis(false);
            if (!confirmNeeded) {
              setConfirmNeeded(true);
              getFollowUpExecute({
                session_id: newSessionId || diagnosisSessionId || undefined,
                disease,
                confidence,
                uncertainty,
                asked_questions: askedQuestions,
                symptoms: form.getValues("symptoms"),
                top_diseases: top_diseases || [],
                force: true,
                current_probs: mean_probs || undefined,
              });
            } else {
              setCurrentQuestion(null);
            }
          }
        }
      },
    },
  );

  const {
    execute: createMessageExecute,
    optimisticState: optimisticMessages,
    isExecuting: isCreatingMessage,
  } = useOptimisticAction(createMessage, {
    currentState: messages,
    updateFn: (currentMessages, newMessage: any) => {
      return [...currentMessages, newMessage];
    },
    onSuccess: ({ data }) => {
      // Guard: ignore callbacks after unmount to prevent stale state updates
      if (!isMountedRef.current) return;
      if (data.success) {
        const created = data.success as any;

        if (created.role === "USER" && created.type === "SYMPTOMS") {
          initialSymptomsRef.current = created.content;
          // Reset all diagnosis state for new case - batch related updates
          setCurrentQuestion(null);
          setAskedQuestions([]);
          setConfirmNeeded(false);
          setIsFinalDiagnosis(false);
          setDiagnosisSessionId(null);
          lastDiagnosisRef.current = null;
          followUpPendingRef.current = false;
          finalDiagnosisInFlightRef.current = false;
          finalDiagnosisCreatedRef.current = false;

          // Cancel any in-flight follow-up requests
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
          }

          if (!diagnosisRequestedRef.current.has(created.id)) {
            diagnosisRequestedRef.current.add(created.id);
            runDiagnosisExecute({
              chatId,
              symptoms: created.content,
              skipMessage: true,
            });
          }
        }

        if (created.type === "DIAGNOSIS") {
          finalDiagnosisInFlightRef.current = false;
          finalDiagnosisCreatedRef.current = true;

          const symptomsText = lastDiagnosisRef.current?.symptoms;
          const meanProbs = lastDiagnosisRef.current?.mean_probs;

          if (!explanationRequestedRef.current.has(created.id)) {
            explanationRequestedRef.current.add(created.id);
            lastExplanationMessageIdRef.current = created.id;

            if (meanProbs && Array.isArray(meanProbs)) {
              getExplanations({
                symptoms: symptomsText,
                meanProbs,
                messageId: created.id,
              });
            } else {
              // Fallback: try to get explanation without mean_probs
              // This can happen if the diagnosis data doesn't include mean_probs
              console.warn(
                "[ChatWindow] mean_probs not available for explanation, attempting fallback",
              );
              // The explanation action requires meanProbs, so we can't call it here
              // The explanation will need to be fetched on page reload via getExplanationByChatId
            }
          }
        }

        // Handle INFO messages with tempDiagnosis (inconclusive cases).
        // These are diagnoses where is_valid=false from the backend.
        // Auto-record them immediately with INCONCLUSIVE status — no SHAP needed.
        if (
          created.type === "INFO" &&
          created.tempDiagnosis &&
          created.tempDiagnosis.isValid === false
        ) {
          // Mark as final so the UI shows completion state
          finalDiagnosisCreatedRef.current = true;

          // Auto-record inconclusive diagnosis if not already recorded
          if (!chat.hasDiagnosis) {
            console.log(
              "[ChatWindow] Auto-recording inconclusive diagnosis for message",
              created.id,
            );
            autoRecordExecute({
              messageId: created.id,
              chatId,
              isInconclusive: true,
            });
          }
        }
      } else if (data.error) {
        console.error("Error creating message:", data.error);
      }
    },
    onError: ({ error }) => {
      // Guard: ignore callbacks after unmount
      if (!isMountedRef.current) return;
      // If DIAGNOSIS creation failed, allow a subsequent stop response to retry.
      finalDiagnosisInFlightRef.current = false;
      console.error("Failed to create message:", error);
    },
  });

  const handleQuestionAnswer = async (
    answer: "yes" | "no",
    symptom: string,
    questionId: string,
  ) => {
    // Prevent concurrent follow-up requests - Next.js best practice for async operations
    if (followUpPendingRef.current) {
      console.warn(
        "[handleQuestionAnswer] Follow-up request already pending, ignoring duplicate call",
      );
      return;
    }

    // Cancel any in-flight request to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    followUpPendingRef.current = true;

    // Batch state updates to minimize re-renders
    const updatedAsked = [...askedQuestions, questionId];
    setAskedQuestions(updatedAsked);
    setCurrentQuestion(null);

    try {
      // Create user answer message first
      await createMessageExecute({
        chatId,
        content: symptom,
        type: "ANSWER",
        role: "USER",
      });

      // Get next follow-up question with proper error handling
      await getFollowUpExecute({
        session_id: diagnosisSessionId || undefined,
        disease: currentDiagnosis?.disease || "",
        confidence: currentDiagnosis?.confidence || 0,
        uncertainty: currentDiagnosis?.uncertainty || 1,
        asked_questions: updatedAsked,
        symptoms: getCurrentSymptoms(),
        top_diseases: currentDiagnosis?.top_diseases || [],
        last_answer: answer,
        last_question_id: questionId,
        last_question_text: currentQuestion?.question,
        current_probs: currentDiagnosis?.mean_probs || undefined,
      });
    } catch (error) {
      // Only log actual errors, ignore abort signals from intentional cancellations
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("[handleQuestionAnswer] Error during follow-up:", error);
        createMessageExecute({
          chatId,
          content:
            "An error occurred while processing your answer. Please try again or start a new symptom check.",
          type: "ERROR",
          role: "AI",
        });
      }
    } finally {
      // Always release the lock, even on error
      followUpPendingRef.current = false;
    }
  };

  const handleSkipToResults = async () => {
    // Prevent concurrent requests
    if (followUpPendingRef.current) {
      console.warn(
        "[handleSkipToResults] Follow-up request already pending, ignoring duplicate call",
      );
      return;
    }

    // Cancel any in-flight request to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    followUpPendingRef.current = true;
    setCurrentQuestion(null);

    try {
      // Create a message indicating user skipped to results
      await createMessageExecute({
        chatId,
        content: "I'd like to see the results now.",
        type: "ANSWER",
        role: "USER",
      });

      // Get final diagnosis with force_complete flag
      await getFollowUpExecute({
        session_id: diagnosisSessionId || undefined,
        disease: currentDiagnosis?.disease || "",
        confidence: currentDiagnosis?.confidence || 0,
        uncertainty: currentDiagnosis?.uncertainty || 1,
        asked_questions: askedQuestions,
        symptoms: getCurrentSymptoms(),
        top_diseases: currentDiagnosis?.top_diseases || [],
        current_probs: currentDiagnosis?.mean_probs || undefined,
        force_complete: true,
      });
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("[handleSkipToResults] Error:", error);
        createMessageExecute({
          chatId,
          content:
            "An error occurred while processing your request. Please try again.",
          type: "ERROR",
          role: "AI",
        });
      }
    } finally {
      followUpPendingRef.current = false;
    }
  };

  const hasRunInitialDiagnosis = useRef<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Cleanup on unmount - cancel any in-flight requests to prevent memory leaks
  useEffect(() => {
    // Mark as mounted when effect runs
    isMountedRef.current = true;
    return () => {
      // Mark as unmounted to stop onSuccess callbacks from firing
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      followUpPendingRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      form.reset({
        chatId,
        symptoms: "",
      });
      // Reset all diagnosis state when chat changes
      setCurrentQuestion(null);
      setAskedQuestions([]);
      setConfirmNeeded(false);
      setCurrentDiagnosis(null);
      setIsFinalDiagnosis(false);
      setDiagnosisSessionId(null);
      lastDiagnosisRef.current = null;
      hasRunInitialDiagnosis.current = false;
      explanationRequestedRef.current = new Set();
      diagnosisRequestedRef.current = new Set();
      followUpPendingRef.current = false;
      finalDiagnosisInFlightRef.current = false;
      finalDiagnosisCreatedRef.current = false;

      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      prevChatIdRef.current = chatId;
    }
  }, [chatId, form]);

  // Restore hasRunInitialDiagnosis from sessionStorage
  useEffect(() => {
    if (sessionStorage.getItem(`diagnosis-run-${chatId}`) === "true") {
      hasRunInitialDiagnosis.current = true;
    }
  }, [chatId]);

  useEffect(() => {
    const hasExistingAiMessages = messages.some((m) => m.role === "AI");
    if (chat.hasDiagnosis || hasExistingAiMessages) return;

    if (messages.length === 1 && !hasRunInitialDiagnosis.current) {
      runDiagnosisExecute({
        chatId,
        symptoms: messages[0].content,
        skipMessage: true,
      });
      hasRunInitialDiagnosis.current = true;
      sessionStorage.setItem(`diagnosis-run-${chatId}`, "true");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, chatId, chat.hasDiagnosis]);

  // Recovery: if the page detected a limbo TempDiagnosis (has explanation but
  // no permanent Diagnosis), retry auto-record on mount. This handles the case
  // where a transient DB error prevented the original auto-record from succeeding.
  useEffect(() => {
    if (!needsRecovery) return;

    const diagnosisMessage = messages.find(
      (m) => m.type === "DIAGNOSIS" && m.role === "AI",
    );
    if (!diagnosisMessage?.id) return;

    console.log(
      "[ChatWindow] Recovery mode: retrying auto-record for limbo diagnosis",
    );
    autoRecordExecute({
      messageId: diagnosisMessage.id,
      chatId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsRecovery, chatId]);

  return (
    <FormProvider {...form}>
      <div className="flex flex-col h-full w-full">
        {/* Scrollable messages area — scroll stays inside the card, not the viewport */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full flex flex-col items-center pb-8">
          <ThreadTransition className="w-full max-w-[768px]">
            <ChatContainer
              ref={chatEndRef}
              messages={
                optimisticMessages.map((msg) => ({
                  ...msg,
                  explanation:
                    msg.explanation ||
                    (msg.id && messageExplanations[msg.id]) ||
                    null,
                })) as any
              }
              isGettingQuestion={isGettingQuestion}
              isDiagnosing={isDiagnosing}
              isGettingExplanations={isGettingExplanations}
              isCreatingMessage={isCreatingMessage}
              hasDiagnosis={chat.hasDiagnosis}
              currentQuestion={currentQuestion as any}
              onQuestionAnswer={handleQuestionAnswer}
              dbExplanation={dbExplanation as unknown as TempExplanation}
              userRole={userRole}
            />
            {isFinalDiagnosis && currentDiagnosis?.cdss && (
              <div className="mt-2 w-full">
                <CDSSSummary
                  cdss={currentDiagnosis.cdss}
                  confidence={currentDiagnosis.confidence ?? undefined}
                  uncertainty={currentDiagnosis.uncertainty ?? undefined}
                  isValid={currentDiagnosis.is_valid}
                />
              </div>
            )}
          </ThreadTransition>
        </div>

        {/* Pinned input bar — sits in normal flow below the scroll area, full card width */}
        {!chat.hasDiagnosis && (
          <div className="shrink-0 w-full bg-base-100 border-t border-base-200 p-4 pt-3">
            <div className="w-full max-w-[768px] mx-auto">
              <DiagnosisForm
                createMessageExecute={createMessageExecute}
                isPending={
                  isDiagnosing || isCreatingMessage || isGettingQuestion
                }
                disabled={!!currentQuestion || isFinalDiagnosis}
              />
            </div>
          </div>
        )}
      </div>
    </FormProvider>
  );
};

export default ChatWindow;
