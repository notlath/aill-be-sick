"use client";

import { useEffect, useRef, useState } from "react";
import ChatContainer from "./chat-container";
import DiagnosisForm from "./diagnosis-form";
import { Chat, Explanation, Message } from "@/app/generated/prisma";
import { useAction, useOptimisticAction } from "next-safe-action/hooks";
import { runDiagnosis } from "@/actions/run-diagnosis";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateChatSchema,
  CreateChatSchemaType,
} from "@/schemas/CreateChatSchema";
import { FormProvider, useForm } from "react-hook-form";
import { createMessage } from "@/actions/create-message";
import { useUserLocation } from "@/hooks/use-location";
import { getFollowUpQuestion } from "@/actions/get-follow-up-question";
import { explainDiagnosis } from "@/actions/explain-diagnosis";
import { Explanation as TempExplanation } from "@/types";
import CDSSSummary from "./cdss-summary";

// Helpers to map backend strings to enum values expected by CreateMessageSchema
const mapModelUsed = (
  modelUsed?: string
): "BIOCLINICAL_MODERNBERT" | "ROBERTA_TAGALOG" => {
  if (!modelUsed) return "BIOCLINICAL_MODERNBERT";
  const lower = modelUsed.toLowerCase();
  if (lower.includes("roberta") || lower.includes("tagalog"))
    return "ROBERTA_TAGALOG";
  return "BIOCLINICAL_MODERNBERT";
};

const mapDisease = (
  disease?: string
): "DENGUE" | "PNEUMONIA" | "TYPHOID" | "IMPETIGO" => {
  switch ((disease || "").toLowerCase()) {
    case "dengue":
      return "DENGUE";
    case "pneumonia":
      return "PNEUMONIA";
    case "typhoid":
      return "TYPHOID";
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
    "adaptive"
  );

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
            } = diagnosis;
            setCurrentDiagnosis({
              disease,
              confidence,
              uncertainty,
              top_diseases,
              cdss,
              model_used,
            });
            // Persist current full symptoms for later explanations
            lastDiagnosisRef.current = {
              ...(lastDiagnosisRef.current || {}),
              ...diagnosis,
              symptoms: getCurrentSymptoms(),
            };
          }

          if (reason === "SYMPTOMS_NOT_MATCHING") {
            // Terminal but not a confident final prediction; do not show CDSS summary
            setIsFinalDiagnosis(false);
            createMessageExecute({
              chatId,
              content:
                "Based on your responses, your symptoms don't strongly match any of the conditions we currently cover (Dengue, Pneumonia, Typhoid, or Impetigo). We recommend consulting with a healthcare professional for a proper evaluation.",
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
                : `You may not be experiencing a disease that this system can process or your inputs are invalid.`;

              // Log when confidence is good but below impressive threshold
              if (!impressive && (confidence ?? 0) >= 0.9) {
                console.warn(
                  `[LOG_DISCREPANCY] Valid diagnosis below impressive threshold | disease=${disease} | conf=${(
                    confidence * 100
                  ).toFixed(2)}% | MI=${(uncertainty * 100).toFixed(
                    2
                  )}% | showing_error_msg=YES`
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
          data
        );
        if (data?.error) {
          let errorMessage = "";

          if (data.error === "UNSUPPORTED_LANGUAGE") {
            errorMessage = `Sorry, I detected that you're using a different language, which is not currently supported. Please describe your symptoms in **English** or **Filipino**.`;
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
        } else if (data?.success && data?.diagnosis) {
          console.log("[DEBUG] ENTERED SUCCESS HANDLER - data:", data);
          const {
            disease,
            confidence,
            uncertainty,
            top_diseases,
            cdss,
            model_used,
          } = data.diagnosis as any;

          setCurrentDiagnosis({
            disease,
            confidence,
            uncertainty,
            top_diseases,
            cdss,
            model_used,
          });
          lastDiagnosisRef.current = {
            ...data.diagnosis,
            symptoms: form.getValues("symptoms"),
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
            shouldSkipFollowup
          );
          console.log(
            "[DEBUG] Chat Window - diagnosis object:",
            data.diagnosis
          );
          console.log(
            "[DEBUG] Chat Window - skip_followup value:",
            (data.diagnosis as any)?.skip_followup
          );
          console.log(
            "[DEBUG] Chat Window - skip_followup type:",
            typeof (data.diagnosis as any)?.skip_followup
          );

          if (shouldSkipFollowup) {
            // Backend says diagnosis is very confident (≥95%), mark as final immediately
            setIsFinalDiagnosis(true);

            // Create final diagnosis message
            const impressive = (confidence ?? 0) >= 0.95;
            const summary = impressive
              ? `Final assessment: ${disease} (confidence ${(
                  confidence * 100
                ).toFixed(1)}%)`
              : `Assessment complete: ${disease}`;

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
              });
            } else {
              setCurrentQuestion(null);
              // This path may represent a finalized case after forced confirmation
              // We'll still wait for follow-up response to mark final
            }
          }
        }
      },
    }
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

          runDiagnosisExecute({
            chatId,
            symptoms: created.content,
            skipMessage: true,
          });
        }

        if (created.type === "DIAGNOSIS") {
          const symptomsText = lastDiagnosisRef.current?.symptoms;
          const meanProbs = lastDiagnosisRef.current?.mean_probs;

          if (meanProbs && Array.isArray(meanProbs)) {
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
    questionId: string
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
    });
  };

  const hasRunInitialDiagnosis = useRef<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (messages.length === 1 && !hasRunInitialDiagnosis.current) {
      runDiagnosisExecute({
        chatId,
        symptoms: messages[0].content,
        skipMessage: true,
      });
      hasRunInitialDiagnosis.current = true;
    }
  }, [messages.length, chatId, runDiagnosisExecute]);

  return (
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
          />
          <div className="flex justify-between items-center mt-2">
            <label className="label">
              <span className="label-text">Mode</span>
            </label>
            <div className="btn-group">
              <button
                className={`btn btn-ghost ${
                  diagnosisMode === "adaptive" ? "btn-active" : ""
                }`}
                onClick={() => setDiagnosisMode("adaptive")}
              >
                Adaptive
              </button>
              <button
                className={`btn btn-ghost ${
                  diagnosisMode === "legacy" ? "btn-active" : ""
                }`}
                onClick={() => setDiagnosisMode("legacy")}
              >
                Legacy
              </button>
            </div>
          </div>
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
  );
};

export default ChatWindow;
