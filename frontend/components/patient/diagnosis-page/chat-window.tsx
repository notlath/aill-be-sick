"use client";

import { useEffect, useRef, useState } from "react";
import ChatContainer from "./chat-container";
import DiagnosisForm from "./diagnosis-form";
import { Chat, Message } from "@/app/generated/prisma";
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
import QuestionBubble from "./question-bubble";

type ChatWindowProps = {
  chatId: string;
  messages: Message[];
  chat: Chat;
};

const ChatWindow = ({ chatId, messages, chat }: ChatWindowProps) => {
  const { location, requestLocation } = useUserLocation();
  const [currentQuestion, setCurrentQuestion] = useState<{
    id: string;
    question: string;
    positive_symptom: string;
    negative_symptom: string;
    category?: string;
  } | null>(null);
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
  const [positiveSymptoms, setPositiveSymptoms] = useState<string[]>([]);
  const lastAnswerRef = useRef<{
    answer: "yes" | "no";
    questionId: string;
    questionText?: string;
  } | null>(null);

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
    top_diseases?: Array<{ disease: string; probability: number }>;
  } | null>(null);
  const [confirmNeeded, setConfirmNeeded] = useState(false);
  const [diagnosisMode, setDiagnosisMode] = useState<"adaptive" | "legacy">(
    (process.env.NEXT_PUBLIC_DIAGNOSIS_MODE as "adaptive" | "legacy") ||
      "adaptive"
  );
  const lastDiagnosisRef = useRef<any>(null);
  const form = useForm<CreateChatSchemaType>({
    defaultValues: {
      symptoms: "",
      chatId,
    },
    resolver: zodResolver(CreateChatSchema),
  });

  const { execute: getFollowUpExecute, isExecuting: isGettingQuestion } =
    useAction(getFollowUpQuestion, {
      onSuccess: ({ data }) => {
        if (data?.success) {
          const { should_stop, question, reason, message } = data.success;

          if (should_stop) {
            console.log("Stopping questions:", reason);

            // Check if symptoms don't match our covered diseases
            if (reason === "SYMPTOMS_NOT_MATCHING") {
              // Show graceful message that their symptoms don't match our covered diseases
              createMessageExecute({
                chatId,
                content:
                  message ||
                  "Based on your responses, your symptoms don't strongly match any of the conditions we currently cover (Dengue, Pneumonia, Typhoid, or Impetigo). We recommend consulting with a healthcare professional for a proper evaluation.",
                type: "ERROR",
                role: "AI",
              });
              setCurrentQuestion(null);
              return;
            }

            // If no more disease-specific questions are available, finalize a best-effort diagnosis
            if (reason === "No more questions available") {
              const last = lastDiagnosisRef.current;
              if (last) {
                const {
                  disease,
                  confidence,
                  uncertainty,
                  top_diseases,
                  model_used,
                  probs,
                } = last as any;

                const transformedModelUsed = (model_used || "UNKNOWN")
                  .toUpperCase()
                  .replace(/\s+/g, "_") as
                  | "BIOCLINICAL_MODERNBERT"
                  | "ROBERTA_TAGALOG";

                const transformedDisease = disease.toUpperCase() as
                  | "DENGUE"
                  | "PNEUMONIA"
                  | "TYPHOID"
                  | "IMPETIGO";

                // Build the probability list
                let probsList = "";
                if (probs && Array.isArray(probs)) {
                  probsList = probs.map((prob: any) => `- ${prob}`).join("\n");
                } else if (top_diseases && Array.isArray(top_diseases)) {
                  probsList = top_diseases
                    .map(
                      (d: any) =>
                        `- ${d.disease}: ${(d.probability * 100).toFixed(2)}%`
                    )
                    .join("\n");
                }

                // Get all symptoms
                const initialSymptom = (
                  messages.find(
                    (m) => m.type === "SYMPTOMS" && m.role === "USER"
                  )?.content || form.getValues("symptoms")
                ).toString();
                const allSymptoms = [initialSymptom, ...positiveSymptoms]
                  .filter(Boolean)
                  .join(". ");

                // Build diagnosis message (moderate confidence since questions exhausted)
                const diagnosisMessage = `Based on your symptom description, you might be experiencing: **${disease}**.

Here are other most likely conditions based on your symptoms:
${probsList}

The **uncertainty score** associated with this diagnosis is **${(
                  uncertainty * 100
                ).toFixed(4)}%**.

After asking all available questions, the confidence score is ${(
                  confidence * 100
                ).toFixed(
                  4
                )}%. It is recommended to seek professional medical advice for confirmation.

Do you want to record this diagnosis?`;

                // Create the AI diagnosis message with tempDiagnosis
                createMessageExecute({
                  chatId,
                  content: diagnosisMessage,
                  type: "DIAGNOSIS",
                  role: "AI",
                  tempDiagnosis: {
                    confidence,
                    uncertainty,
                    modelUsed: transformedModelUsed,
                    disease: transformedDisease,
                    symptoms: allSymptoms,
                  },
                });
              }
            }
            setCurrentQuestion(null);
          } else if (question) {
            // Compose professional clinical AI message and persist
            const aiContent = question.question;

            // Persist the AI question as a chat message
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
          }
        } else if (data?.error) {
          console.error("Error getting follow-up question:", data.error);
          setCurrentQuestion(null);
        }
      },
    });

  const { execute: runDiagnosisExecute, isExecuting: isDiagnosing } = useAction(
    runDiagnosis,
    {
      onSuccess: ({ data }) => {
        if (data?.error) {
          // Create error message as a chat bubble instead of modal
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

          // Add error as AI chat message
          createMessageExecute({
            chatId,
            content: errorMessage,
            type: "ERROR",
            role: "AI",
          });
        } else if (data?.success && data?.diagnosis) {
          // Store diagnosis info
          const { disease, confidence, uncertainty, top_diseases } =
            data.diagnosis;
          setCurrentDiagnosis({
            disease,
            confidence,
            uncertainty,
            top_diseases,
          });
          lastDiagnosisRef.current = { ...data.diagnosis };

          // Check if we should ask follow-up questions (if not confident)
          if (!data.isConfident) {
            // Get first follow-up question
            getFollowUpExecute({
              disease,
              confidence,
              uncertainty,
              asked_questions: askedQuestions,
              symptoms: getCurrentSymptoms(),
              top_diseases: top_diseases || [],
              mode: diagnosisMode,
              // include last answer context if available
              last_answer: lastAnswerRef.current?.answer,
              last_question_id: lastAnswerRef.current?.questionId,
              last_question_text: lastAnswerRef.current?.questionText,
            });
          } else {
            // Diagnosis is confident
            // Request a confirmatory question once before finalizing
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
                last_answer: lastAnswerRef.current?.answer,
                last_question_id: lastAnswerRef.current?.questionId,
                last_question_text: lastAnswerRef.current?.questionText,
              });
            } else {
              // Confirmatory question was already asked - now finalize
              // The diagnosis message is already shown from runDiagnosis
              setCurrentQuestion(null);
              // Don't ask more questions - diagnosis is final
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
      const updatedMessages = [...currentMessages, newMessage];

      return updatedMessages;
    },
    onSuccess: ({ data }) => {
      if (data.success) {
        const created = data.success as any;
        console.log("Message created successfully:", created);

        // Only run diagnosis automatically for user-submitted SYMPTOMS messages (from the form)
        if (created.role === "USER" && created.type === "SYMPTOMS") {
          runDiagnosisExecute({
            chatId,
            symptoms: created.content,
            skipMessage: true, // Skip message - will show after confirmatory if confident
          });
        }
      } else if (data.error) {
        console.error("Error creating message:", data.error);
      }
    },
    onError: ({ error }) => {
      console.error("Failed to create message:", error);
      // Log detailed validation errors if available
      if (error && typeof error === "object" && "validationErrors" in error) {
        console.error(
          "Validation errors details:",
          JSON.stringify(error.validationErrors, null, 2)
        );
      }
    },
  });

  // Handle question answers
  const handleQuestionAnswer = async (
    answer: "yes" | "no",
    symptom: string,
    questionId: string
  ) => {
    // Add question ID to asked questions
    setAskedQuestions((prev) => [...prev, questionId]);

    // Clear current question
    setCurrentQuestion(null);

    // Record last answer context to be sent with next follow-up request
    lastAnswerRef.current = {
      answer,
      questionId,
      questionText: currentQuestion?.question,
    };

    // Use the symptom text directly - it's already a complete sentence from the question bank
    // For Tagalog: "Mayroon din akong..." or "Wala akong..."
    // For English: "I also have..." or "I don't have..."
    const userResponse = symptom;

    // Create user message with natural language
    await createMessageExecute({
      chatId,
      content: userResponse,
      type: "ANSWER",
      role: "USER",
    });

    // Maintain a list of positively confirmed symptoms only
    // The symptom text is already a complete sentence, so we add it as-is
    let newPositives = [...positiveSymptoms];
    if (answer === "yes") {
      newPositives = [...newPositives, symptom];
      setPositiveSymptoms(newPositives);
    }

    // Use the initial symptom (first SYMPTOMS message) and any positives
    const initialSymptom = (
      messages.find((m) => m.type === "SYMPTOMS" && m.role === "USER")
        ?.content || form.getValues("symptoms")
    ).toString();

    const allSymptoms = [initialSymptom, ...newPositives]
      .filter(Boolean)
      .join(". ");

    // If this was a confirmatory question and we already have a diagnosis, DON'T re-run
    // Instead, create the final diagnosis message now
    if (confirmNeeded) {
      setConfirmNeeded(false);
      setCurrentQuestion(null);

      // Create final diagnosis message using stored diagnosis
      const last = lastDiagnosisRef.current;
      if (last) {
        const {
          disease,
          confidence,
          uncertainty,
          probs,
          top_diseases,
          model_used,
        } = last as any;

        const transformedModelUsed = model_used
          .toUpperCase()
          .replace(/\s+/g, "_") as "BIOCLINICAL_MODERNBERT" | "ROBERTA_TAGALOG";

        const transformedDisease = disease.toUpperCase() as
          | "DENGUE"
          | "PNEUMONIA"
          | "TYPHOID"
          | "IMPETIGO";

        // Build the probability list - use probs if available, otherwise format top_diseases
        let probsList = "";
        if (probs && Array.isArray(probs)) {
          probsList = probs.map((prob: any) => `- ${prob}`).join("\n");
        } else if (top_diseases && Array.isArray(top_diseases)) {
          probsList = top_diseases
            .map(
              (d: any) => `- ${d.disease}: ${(d.probability * 100).toFixed(2)}%`
            )
            .join("\n");
        }

        // Get all symptoms first
        const initialSymptom = (
          messages.find((m) => m.type === "SYMPTOMS" && m.role === "USER")
            ?.content || form.getValues("symptoms")
        ).toString();
        const allSymptoms = [initialSymptom, ...positiveSymptoms]
          .filter(Boolean)
          .join(". ");

        // Build diagnosis message based on confidence and uncertainty
        let diagnosisMessage = "";
        if (uncertainty <= 0.03 && confidence >= 0.9) {
          // High confidence, low uncertainty - reliable diagnosis
          diagnosisMessage = `Based on your symptom description, you might be experiencing: **${disease}**.

Here are other most likely conditions based on your symptoms:
${probsList}

The **uncertainty score** associated with this diagnosis is **${(
            uncertainty * 100
          ).toFixed(4)}%**.

A high confidence score (${(confidence * 100).toFixed(
            4
          )}%) combined with a low uncertainty score (${(
            uncertainty * 100
          ).toFixed(4)}%) suggests that **this is a reliable diagnosis.**

Do you want to record this diagnosis?`;
        } else if (confidence < 0.9 && uncertainty <= 0.03) {
          // Lower confidence but low uncertainty - model is unsure
          diagnosisMessage = `Based on your symptom description, you might be experiencing: **${disease}**.

Here are other most likely conditions based on your symptoms:
${probsList}

The **uncertainty score** associated with this diagnosis is **${(
            uncertainty * 100
          ).toFixed(4)}%**.

A moderate confidence score (${(confidence * 100).toFixed(
            4
          )}%) combined with a low uncertainty score suggests that **the model is somewhat unsure about the diagnosis.** It is recommended to seek further medical advice for an accurate diagnosis.

Do you want to record this diagnosis?`;
        } else {
          // Other cases (high uncertainty or other combinations)
          diagnosisMessage = `Based on your symptom description, you might be experiencing: **${disease}**.

Here are other most likely conditions based on your symptoms:
${probsList}

The **uncertainty score** associated with this diagnosis is **${(
            uncertainty * 100
          ).toFixed(4)}%**.

Given the confidence score (${(confidence * 100).toFixed(
            4
          )}%) and uncertainty, it is recommended to seek professional medical advice for an accurate diagnosis.

Do you want to record this diagnosis?`;
        }

        console.log("Creating diagnosis message:", {
          disease,
          confidence,
          uncertainty,
          diagnosisMessage: diagnosisMessage.substring(0, 100),
        });
        console.log("Diagnosis payload:", {
          chatId,
          contentLength: diagnosisMessage.length,
          type: "DIAGNOSIS",
          role: "AI",
          tempDiagnosis: {
            confidence,
            uncertainty,
            modelUsed: transformedModelUsed,
            disease: transformedDisease,
            symptoms: allSymptoms,
          },
        });

        // Create the diagnosis message
        createMessageExecute({
          chatId,
          content: diagnosisMessage,
          type: "DIAGNOSIS",
          role: "AI",
          tempDiagnosis: {
            confidence,
            uncertainty,
            modelUsed: transformedModelUsed,
            disease: transformedDisease,
            symptoms: allSymptoms,
          },
        });
      }

      return; // Stop here - diagnosis is final
    }

    // Otherwise, re-run diagnosis with accumulated symptoms
    runDiagnosisExecute({
      chatId,
      symptoms: allSymptoms,
      skipMessage: true, // Skip message - will show after confirmatory if confident
    });

    // getFollowUp will be triggered by the runDiagnosisExecute response (onSuccess)
  };
  const hasRunInitialDiagnosis = useRef<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasScrolledToBottom = useRef<boolean>(false);

  // Request user location when component mounts
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Smooth scroll to bottom on initial load
  useEffect(() => {
    if (chatEndRef.current && !hasScrolledToBottom.current) {
      const scrollToBottom = () => {
        const element = chatEndRef.current;
        if (!element) return;

        // Get the target position (bottom of the page)
        const targetPosition =
          element.getBoundingClientRect().top + window.scrollY;

        // Calculate starting position (25% above the bottom)
        const viewportHeight = window.innerHeight;
        const startPosition = targetPosition - viewportHeight * 1.25;

        // Scroll to starting position instantly, then smoothly to bottom
        window.scrollTo({
          top: Math.max(0, startPosition),
          behavior: "instant",
        });

        // Use setTimeout to ensure the instant scroll completes first
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 50);

        hasScrolledToBottom.current = true;
      };

      // Small delay to ensure content is rendered
      setTimeout(scrollToBottom, 100);
    }
  }, []);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (hasScrolledToBottom.current && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [optimisticMessages.length]);

  useEffect(() => {
    if (messages.length === 1 && !hasRunInitialDiagnosis.current) {
      runDiagnosisExecute({
        chatId,
        symptoms: messages[0].content,
        skipMessage: true, // Don't create message yet - wait for confirmatory
      });

      hasRunInitialDiagnosis.current = true;
    }
  }, [messages.length, chatId, runDiagnosisExecute]);

  return (
    <FormProvider {...form}>
      <ChatContainer
        ref={chatEndRef}
        messages={optimisticMessages}
        isPending={isDiagnosing || isCreatingMessage || isGettingQuestion}
        hasDiagnosis={chat.hasDiagnosis}
        location={location}
        currentQuestion={currentQuestion}
        onQuestionAnswer={handleQuestionAnswer}
      />
      {!chat.hasDiagnosis && !currentQuestion && (
        <div className="-bottom-0.5 sticky bg-base-200 p-4 pt-0">
          <DiagnosisForm
            createMessageExecute={createMessageExecute}
            isPending={isDiagnosing || isCreatingMessage || isGettingQuestion}
          />
          <div className="mt-2 flex items-center justify-between">
            <label className="label">
              <span className="label-text">Mode</span>
            </label>
            <div className="btn-group">
              <button
                className={`btn ${
                  diagnosisMode === "adaptive" ? "btn-active" : ""
                }`}
                onClick={() => setDiagnosisMode("adaptive")}
              >
                Adaptive
              </button>
              <button
                className={`btn ${
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
