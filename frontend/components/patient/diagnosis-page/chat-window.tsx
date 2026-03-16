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
  | "INFLUENZA"
  | "IMPETIGO" => {
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
    case "impetigo":
      return "IMPETIGO";
    default:
      return "PNEUMONIA";
  }
};

type ChatWindowProps = {
  chatId: string;
  messages: (Message & { explanation?: Explanation | null })[];
  chat: Chat;
  dbExplanation: Explanation | null;
  userRole?: string;
};

const ChatWindow = ({
  chatId,
  messages,
  chat,
  dbExplanation,
  userRole,
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
    category?: string;
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
  } | null>(null);
  const [isFinalDiagnosis, setIsFinalDiagnosis] = useState<boolean>(false);

  const { execute: getFollowUpExecute, isExecuting: isGettingQuestion } =
    useAction(getFollowUpQuestion, {
      onSuccess: ({ data }) => {
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
            } = diagnosis;
            setCurrentDiagnosis({
              disease,
              confidence,
              uncertainty,
              top_diseases,
              cdss,
              model_used,
              mean_probs,
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

          if (
            reason === "SYMPTOMS_NOT_MATCHING" ||
            reason === "OUT_OF_SCOPE" ||
            diagnosis?.is_valid === false
          ) {
            setIsFinalDiagnosis(false);
            const outOfScopeMessage =
              diagnosis?.message ||
              (reason === "OUT_OF_SCOPE"
                ? "Your symptoms may not match the diseases this system covers (Dengue, Pneumonia, Typhoid, Diarrhea, Measles, Influenza). Please consult a healthcare professional for a proper evaluation."
                : "Based on your responses, your symptoms don't strongly match any of the conditions we currently cover. We recommend consulting with a healthcare professional for a proper evaluation.");
            createMessageExecute({
              chatId,
              content: outOfScopeMessage,
              type: "INFO",
              role: "AI",
            });
            setCurrentQuestion(null);
            return;
          }

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
              const impressive = (confidence ?? 0) >= 0.9;

              const summary = impressive
                ? `Final assessment: ${disease} (confidence ${(
                    confidence * 100
                  ).toFixed(1)}%)`
                : diagnosis.message || `Assessment complete: ${disease}`;

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
              category: question.category,
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
      if (data?.success) {
        if (data.requiresManualRecord) {
          // Low-confidence diagnosis - requires user consent
          console.log(
            `[ChatWindow] Auto-record skipped (confidence ${data.confidence?.toFixed(3)}), waiting for manual record`,
          );
        } else {
          // High-confidence diagnosis - auto-recorded successfully
          console.log("[ChatWindow] Diagnosis auto-recorded:", data.success);
        }
      } else if (data?.error) {
        console.error("[ChatWindow] Auto-record error:", data.error);
      }
    },
    onError: ({ error }) => {
      console.error("[ChatWindow] Auto-record request failed:", error);
    },
  });

  const { execute: getExplanations, isExecuting: isGettingExplanations } =
    useAction(explainDiagnosis, {
      onSuccess: ({ data }) => {
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
            // HYBRID APPROACH: Only high-confidence diagnoses (≥95%) are auto-recorded.
            // Low-confidence diagnoses require explicit user consent via manual recording.
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
        console.error("[ChatWindow] Explanation request failed:", error);
      },
    });

  const { execute: runDiagnosisExecute, isExecuting: isDiagnosing } = useAction(
    runDiagnosis,
    {
      onSuccess: ({ data }) => {
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
          });
          lastDiagnosisRef.current = {
            ...data.diagnosis,
            symptoms: getCurrentSymptoms() || data.diagnosis.symptoms,
          };

          const shouldSkipFollowup =
            (data.diagnosis as any)?.skip_followup === true;

          if (shouldSkipFollowup) {
            const skipReason = (data.diagnosis as any)?.skip_reason;

            if (skipReason === "OUT_OF_SCOPE") {
              setIsFinalDiagnosis(false);
              const verificationFailure = (data.diagnosis as any)
                ?.verification_failure;
              const infoMsg =
                verificationFailure?.message ||
                "Your symptoms may not match the diseases this system covers. Please consult a healthcare professional.";

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
              const impressive = (confidence ?? 0) >= 0.95;
              const summary = impressive
                ? `Final assessment: ${disease} (confidence ${(
                    confidence * 100
                  ).toFixed(1)}%)`
                : (data.diagnosis as any)?.message ||
                  `Assessment complete: ${disease}`;

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

            if (
              meanProbs &&
              Array.isArray(meanProbs)
            ) {
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
      } else if (data.error) {
        console.error("Error creating message:", data.error);
      }
    },
    onError: ({ error }) => {
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
            "An error occurred while processing your answer. Please try again or start a new diagnosis.",
          type: "ERROR",
          role: "AI",
        });
      }
    } finally {
      // Always release the lock, even on error
      followUpPendingRef.current = false;
    }
  };

  const hasRunInitialDiagnosis = useRef<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Cleanup on unmount - cancel any in-flight requests to prevent memory leaks
  useEffect(() => {
    return () => {
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

  return (
    <FormProvider {...form}>
      <div className="flex flex-col h-full w-full">
        {/* Scrollable messages area — scroll stays inside the card, not the viewport */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full flex flex-col items-center">
          <ThreadTransition className="w-full max-w-[768px]">
            <ChatContainer
              ref={chatEndRef}
              messages={optimisticMessages.map((msg) => ({
                ...msg,
                explanation:
                  msg.explanation ||
                  (msg.id && messageExplanations[msg.id]) ||
                  null,
              })) as any}
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
            {isFinalDiagnosis &&
              currentDiagnosis?.cdss &&
              (currentDiagnosis?.confidence ?? 0) >= 0.95 && (
                <div className="mt-3">
                  <CDSSSummary cdss={currentDiagnosis.cdss} />
                </div>
              )}
            <dialog id="record_success_modal" className="modal">
              <div className="modal-box">
                <form method="dialog">
                  <button className="top-2 right-2 absolute btn btn-sm btn-circle btn-ghost">
                    ✕
                  </button>
                </form>
                <h3 className="font-bold text-lg">Diagnosis recorded</h3>
                <p className="py-4 text-muted">
                  This diagnosis has been successfully stored and saved in the
                  records!
                </p>
              </div>
            </dialog>
          </ThreadTransition>
        </div>

        {/* Pinned input bar — sits in normal flow below the scroll area, full card width */}
        {!chat.hasDiagnosis && (
          <div className="shrink-0 w-full bg-base-100 border-t border-base-200 p-4 pt-3">
            <div className="w-full max-w-[768px] mx-auto">
              <DiagnosisForm
                createMessageExecute={createMessageExecute}
                isPending={isDiagnosing || isCreatingMessage || isGettingQuestion}
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
