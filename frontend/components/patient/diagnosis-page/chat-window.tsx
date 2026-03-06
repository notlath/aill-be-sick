"use client";

import { createMessage } from "@/actions/create-message";
import { explainDiagnosis } from "@/actions/explain-diagnosis";
import { getFollowUpQuestion } from "@/actions/get-follow-up-question";
import { runDiagnosis } from "@/actions/run-diagnosis";
import { useUserLocation } from "@/hooks/use-location";
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
  messages: Message[];
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
  const { location, requestLocation } = useUserLocation();

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
  const [positiveSymptoms, setPositiveSymptoms] = useState<string[]>([]);
  const [confirmNeeded, setConfirmNeeded] = useState<boolean>(false);
  const [diagnosisMode, setDiagnosisMode] = useState<"adaptive" | "legacy">(
    "adaptive",
  );

  const prevChatIdRef = useRef<string>(chatId);
  const explanationRequestedRef = useRef<Set<string>>(new Set());
  const diagnosisRequestedRef = useRef<Set<string>>(new Set());

  const lastAnswerRef = useRef<{
    answer: "yes" | "no";
    questionId: string;
    questionText?: string;
  } | null>(null);
  const lastDiagnosisRef = useRef<any>(null);

  const getCurrentSymptoms = () => {
    const initialSymptom = (
      messages.find((m) => m.type === "SYMPTOMS" && m.role === "USER")
        ?.content || form.getValues("symptoms")
    ).toString();

    return [initialSymptom, ...positiveSymptoms].filter(Boolean).join(". ");
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
          const { question, should_stop, reason, diagnosis } =
            data.success as any;

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
            // Persist current full symptoms for later explanations
            lastDiagnosisRef.current = {
              ...(lastDiagnosisRef.current || {}),
              ...diagnosis,
              symptoms: getCurrentSymptoms(),
            };
          }

          if (
            reason === "SYMPTOMS_NOT_MATCHING" ||
            reason === "OUT_OF_SCOPE" ||
            diagnosis?.is_valid === false
          ) {
            // Terminal but not a confident final prediction; do not show CDSS summary
            setIsFinalDiagnosis(false);
            const outOfScopeMessage =
              diagnosis?.message ||
              (reason === "OUT_OF_SCOPE"
                ? "Your symptoms may not match the diseases this system covers (Dengue, Pneumonia, Typhoid, Diarrhea, Measles, Influenza). Please consult a healthcare professional for a proper evaluation."
                : "Based on your responses, your symptoms don't strongly match any of the conditions we currently cover. We recommend consulting with a healthcare professional for a proper evaluation.");
            createMessageExecute({
              chatId,
              content: outOfScopeMessage,
              type: "ERROR",
              role: "AI",
            });
            setCurrentQuestion(null);
            return;
          }

          if (should_stop && !question) {
            // Finalized prediction reached
            setIsFinalDiagnosis(true);
            // Create a DIAGNOSIS message to surface record + insights buttons and persist temp diagnosis
            if (diagnosis) {
              const { disease, confidence, uncertainty, model_used } =
                diagnosis;
              const impressive = (confidence ?? 0) >= 0.9;

              // If confidence is high, show the final assessment.
              // Otherwise, avoid showing the disease/confidence to the patient to prevent alarm.
              const summary = impressive
                ? `Final assessment: ${disease} (confidence ${(
                    confidence * 100
                  ).toFixed(1)}%)`
                : diagnosis.message || `Assessment complete: ${disease}`;

              // Log when confidence is good but below impressive threshold
              if (!impressive && (confidence ?? 0) >= 0.9) {
                console.warn(
                  `[LOG_DISCREPANCY] Valid diagnosis below impressive threshold | disease=${disease} | conf=${(
                    confidence * 100
                  ).toFixed(2)}% | MI=${(uncertainty * 100).toFixed(
                    2,
                  )}% | showing_error_msg=NO`,
                );
              }

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
                },
              });
            }
            setCurrentQuestion(null);
            return;
          }

          if (question) {
            // Still collecting evidence; keep CDSS summary hidden
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

  const { execute: getExplanations, isExecuting: isGettingExplanations } =
    useAction(explainDiagnosis, {});

  const { execute: runDiagnosisExecute, isExecuting: isDiagnosing } = useAction(
    runDiagnosis,
    {
      onSuccess: ({ data }) => {
        console.log(
          "[DEBUG BROWSER] onSuccess callback triggered, data:",
          data,
        );
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
          // Allow retry if initial diagnosis failed.
          hasRunInitialDiagnosis.current = false;
        } else if (data?.success && data?.diagnosis) {
          console.log("[DEBUG] ENTERED SUCCESS HANDLER - data:", data);
          const {
            disease,
            confidence,
            uncertainty,
            top_diseases,
            cdss,
            model_used,
            mean_probs,
          } = data.diagnosis as any;

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

          // Check if backend explicitly said to skip follow-up (very high confidence)
          // Force recompile: 2025-11-01 19:30:00
          const shouldSkipFollowup =
            (data.diagnosis as any)?.skip_followup === true;

          // Debug logging
          console.log(
            "[DEBUG] Chat Window - isConfident:",
            data.isConfident,
            "shouldSkipFollowup:",
            shouldSkipFollowup,
          );
          console.log(
            "[DEBUG] Chat Window - diagnosis object:",
            data.diagnosis,
          );
          console.log(
            "[DEBUG] Chat Window - skip_followup value:",
            (data.diagnosis as any)?.skip_followup,
          );
          console.log(
            "[DEBUG] Chat Window - skip_followup type:",
            typeof (data.diagnosis as any)?.skip_followup,
          );

          if (shouldSkipFollowup) {
            const skipReason = (data.diagnosis as any)?.skip_reason;

            if (skipReason === "OUT_OF_SCOPE") {
              // Verification failure - show error message instead of diagnosis
              setIsFinalDiagnosis(false);
              const verificationFailure = (data.diagnosis as any)
                ?.verification_failure;
              const errorMessage =
                verificationFailure?.message ||
                "Your symptoms may not match the diseases this system covers (Dengue, Pneumonia, Typhoid, Diarrhea, Measles, Influenza). Please consult a healthcare professional.";

              createMessageExecute({
                chatId,
                content: errorMessage,
                type: "ERROR",
                role: "AI",
              });
              setCurrentQuestion(null);
              return;
            }

            // Backend says diagnosis is very confident (≥95%), mark as final immediately
            setIsFinalDiagnosis(true);

            // Create final diagnosis message
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
              },
            });
            setCurrentQuestion(null);
          } else if (!data.isConfident) {
            // Initial run is not final until follow-ups decide otherwise
            setIsFinalDiagnosis(false);
            getFollowUpExecute({
              disease,
              confidence,
              uncertainty,
              asked_questions: askedQuestions,
              symptoms: getCurrentSymptoms(),
              top_diseases: top_diseases || [],
              mode: diagnosisMode,
              current_probs: mean_probs || undefined,
            });
          } else {
            // Confident but not high enough to skip entirely - ask confirmation question
            setIsFinalDiagnosis(false);
            if (!confirmNeeded) {
              setConfirmNeeded(true);
              getFollowUpExecute({
                disease,
                confidence,
                uncertainty,
                asked_questions: askedQuestions,
                symptoms: form.getValues("symptoms"),
                top_diseases: top_diseases || [],
                force: true,
                mode: diagnosisMode,
                current_probs: mean_probs || undefined,
              });
            } else {
              setCurrentQuestion(null);
              // This path may represent a finalized case after forced confirmation
              // We'll still wait for follow-up response to mark final
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
          setCurrentQuestion(null);
          setAskedQuestions([]);
          setPositiveSymptoms([]);
          setConfirmNeeded(false);
          setIsFinalDiagnosis(false);

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
          const symptomsText = lastDiagnosisRef.current?.symptoms;
          const meanProbs = lastDiagnosisRef.current?.mean_probs;

          if (
            meanProbs &&
            Array.isArray(meanProbs) &&
            !explanationRequestedRef.current.has(created.id)
          ) {
            explanationRequestedRef.current.add(created.id);
            getExplanations({
              symptoms: symptomsText,
              meanProbs,
              messageId: created.id,
            });
          }
        }
      } else if (data.error) {
        console.error("Error creating message:", data.error);
      }
    },
    onError: ({ error }) => {
      console.error("Failed to create message:", error);
    },
  });

  const handleQuestionAnswer = async (
    answer: "yes" | "no",
    symptom: string,
    questionId: string,
  ) => {
    const updatedAsked = [...askedQuestions, questionId];
    setAskedQuestions(updatedAsked);
    setCurrentQuestion(null);

    lastAnswerRef.current = {
      answer,
      questionId,
      questionText: currentQuestion?.question,
    };

    await createMessageExecute({
      chatId,
      content: symptom,
      type: "ANSWER",
      role: "USER",
    });

    let newPositives = [...positiveSymptoms];

    const initialSymptom = (
      messages.find((m) => m.type === "SYMPTOMS" && m.role === "USER")
        ?.content || form.getValues("symptoms")
    ).toString();

    const initialSymptomText = (
      messages.find((m) => m.type === "SYMPTOMS" && m.role === "USER")
        ?.content || form.getValues("symptoms")
    )
      .toString()
      .toLowerCase();
    const alreadyPresent =
      initialSymptomText.includes(symptom.toLowerCase()) ||
      newPositives.some((s) => s.toLowerCase() === symptom.toLowerCase());
    if (!alreadyPresent) {
      newPositives = [...newPositives, symptom];
      setPositiveSymptoms(newPositives);
    }
    const allSymptoms = [initialSymptom, ...newPositives]
      .filter(Boolean)
      .join(". ");

    getFollowUpExecute({
      disease: currentDiagnosis?.disease || "",
      confidence: currentDiagnosis?.confidence || 0,
      uncertainty: currentDiagnosis?.uncertainty || 1,
      asked_questions: updatedAsked,
      symptoms: allSymptoms,
      top_diseases: currentDiagnosis?.top_diseases || [],
      mode: diagnosisMode,
      last_answer: answer,
      last_question_id: questionId,
      last_question_text: currentQuestion?.question,
      // Round-trip Bayesian-updated probability distribution
      current_probs: currentDiagnosis?.mean_probs || undefined,
    });
  };

  const hasRunInitialDiagnosis = useRef<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      form.reset({
        chatId,
        symptoms: "",
      });
      setCurrentQuestion(null);
      setAskedQuestions([]);
      setPositiveSymptoms([]);
      setConfirmNeeded(false);
      setCurrentDiagnosis(null);
      setIsFinalDiagnosis(false);
      setDiagnosisMode("adaptive");
      lastAnswerRef.current = null;
      lastDiagnosisRef.current = null;
      hasRunInitialDiagnosis.current = false;
      explanationRequestedRef.current = new Set();
      diagnosisRequestedRef.current = new Set();
      prevChatIdRef.current = chatId;
    }
  }, [chatId, form]);

  // Restore hasRunInitialDiagnosis from sessionStorage so navigating away and back
  // (which unmounts/remounts the component) doesn't reset the guard.
  useEffect(() => {
    if (sessionStorage.getItem(`diagnosis-run-${chatId}`) === "true") {
      hasRunInitialDiagnosis.current = true;
    }
  }, [chatId]);

  useEffect(() => {
    // ChatWindow is only rendered for active (non-completed) sessions.
    // The page-level server component routes completed chats to ChatHistoryView.
    // These guards are defense-in-depth only.
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
    <ThreadTransition className="w-full max-w-[768px]">
      <FormProvider {...form}>
        <ChatContainer
          ref={chatEndRef}
          messages={optimisticMessages as any}
          isGettingQuestion={isGettingQuestion}
          isDiagnosing={isDiagnosing}
          isGettingExplanations={isGettingExplanations}
          isCreatingMessage={isCreatingMessage}
          hasDiagnosis={chat.hasDiagnosis}
          location={location}
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
        {!chat.hasDiagnosis && (
          <div className="-bottom-0.5 sticky bg-base-100 p-4 pt-0">
            <DiagnosisForm
              createMessageExecute={createMessageExecute}
              isPending={isDiagnosing || isCreatingMessage || isGettingQuestion}
              disabled={!!currentQuestion}
            />
          {/* <div className="flex justify-between items-center mt-2">
            <label className="label">
              <span className="label-text">Mode</span>
            </label>
            <div className="btn-group">
              <button
                className={`btn btn-ghost ${diagnosisMode === "adaptive" ? "btn-active" : ""
                  }`}
                onClick={() => setDiagnosisMode("adaptive")}
              >
                Adaptive
              </button>
              <button
                className={`btn btn-ghost ${diagnosisMode === "legacy" ? "btn-active" : ""
                  }`}
                onClick={() => setDiagnosisMode("legacy")}
              >
                Legacy
              </button>
            </div>
          </div> */}
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
      </FormProvider>
    </ThreadTransition>
  );
};

export default ChatWindow;
