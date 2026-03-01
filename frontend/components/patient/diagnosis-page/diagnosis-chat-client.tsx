"use client";

import { createDiagnosis } from "@/actions/create-diagnosis";
import { processPendingDiagnosis } from "@/actions/process-pending-diagnosis";
import { submitSymptomsForDiagnosis } from "@/actions/submit-symptoms-for-diagnosis";
import { useUserLocation } from "@/hooks/use-location";
import { ArrowUp, Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useMemo, useRef, useState } from "react";
import InsightsModal from "./insights-modal";
import ViewInsightsBtn from "./view-insights-btn";

type TempDiagnosis = {
  id: number;
  confidence: number;
  uncertainty: number;
  disease:
    | "DENGUE"
    | "PNEUMONIA"
    | "TYPHOID"
    | "DIARRHEA"
    | "MEASLES"
    | "INFLUENZA"
    | "IMPETIGO";
  createdAt: string;
  messageId: number;
  modelUsed: "BIOCLINICAL_MODERNBERT" | "ROBERTA_TAGALOG";
  chatId: string;
  symptoms: string;
};

type Explanation = {
  id: number;
  createdAt: string;
  diagnosisId: number | null;
  tokens: string[];
  importances: number[];
  messageId: number | null;
};

type ChatMessage = {
  id: number;
  content: string;
  role: "USER" | "AI";
  createdAt: string;
  chatId: string;
  type: "SYMPTOMS" | "ANSWER" | "QUESTION" | "DIAGNOSIS" | "URGENT_WARNING" | "ERROR";
  tempDiagnosis: TempDiagnosis | null;
  explanation: Explanation | null;
};

type DiagnosisChatClientProps = {
  chatId: string;
  hasDiagnosis: boolean;
  hasPendingUserMessage: boolean;
  latestDiagnosisMessageId: number | null;
  initialMessages: ChatMessage[];
};

const DiagnosisChatClient = ({
  chatId,
  hasDiagnosis,
  hasPendingUserMessage,
  latestDiagnosisMessageId,
  initialMessages,
}: DiagnosisChatClientProps) => {
  const router = useRouter();
  const [symptoms, setSymptoms] = useState("");
  const [recorded, setRecorded] = useState(hasDiagnosis);
  const startedAutoRunRef = useRef(false);
  const { location, requestLocation } = useUserLocation();

  const { execute: executeProcessPending, isExecuting: isProcessingPending } =
    useAction(processPendingDiagnosis, {
      onSuccess: ({ data }) => {
        if (data?.error) {
          console.error(data.error);
          return;
        }
        router.refresh();
      },
      onError: ({ error }) => {
        console.error(error);
      },
    });

  const { execute: executeSubmitSymptoms, isExecuting: isSubmittingSymptoms } =
    useAction(submitSymptomsForDiagnosis, {
      onSuccess: ({ data }) => {
        if (data?.error) {
          console.error(data.error);
          return;
        }
        setSymptoms("");
        router.refresh();
      },
      onError: ({ error }) => {
        console.error(error);
      },
    });

  const { execute: executeCreateDiagnosis, isExecuting: isRecordingDiagnosis } =
    useAction(createDiagnosis, {
      onSuccess: ({ data }) => {
        if (data?.error) {
          console.error(data.error);
          return;
        }
        setRecorded(true);
        router.refresh();
      },
      onError: ({ error }) => {
        console.error(error);
      },
    });

  useEffect(() => {
    if (!recorded) {
      void requestLocation();
    }
  }, [recorded, requestLocation]);

  useEffect(() => {
    if (startedAutoRunRef.current) return;
    if (recorded) return;
    if (!hasPendingUserMessage) return;
    startedAutoRunRef.current = true;
    executeProcessPending({ chatId });
  }, [chatId, executeProcessPending, hasPendingUserMessage, recorded]);

  const handleSubmitSymptoms = () => {
    const trimmed = symptoms.trim();
    if (!trimmed || recorded) return;
    executeSubmitSymptoms({
      chatId,
      symptoms: trimmed,
    });
  };

  const isFinalized = recorded || hasDiagnosis;
  const isBusy = isSubmittingSymptoms || isProcessingPending || isRecordingDiagnosis;

  const latestRecordableMessageId = useMemo(() => {
    if (isFinalized) return null;
    return latestDiagnosisMessageId;
  }, [isFinalized, latestDiagnosisMessageId]);

  return (
    <section className="mx-auto p-4 md:p-8 w-full max-w-4xl min-h-[80vh]">
      <div className="space-y-4">
        {initialMessages.map((message) => {
          const isUser = message.role === "USER";
          const isDiagnosis = message.type === "DIAGNOSIS" && message.role === "AI";
          const canRecord =
            isDiagnosis &&
            !isFinalized &&
            message.id === latestRecordableMessageId &&
            Boolean(message.tempDiagnosis) &&
            Boolean(message.explanation);
          const hasExplanation = Boolean(message.explanation);
          const modalId = `insights-modal-${message.id}`;

          return (
            <article
              key={message.id}
              className={`chat ${isUser ? "chat-end" : "chat-start"}`}
            >
              <div
                className={`chat-bubble whitespace-pre-wrap ${
                  isUser ? "chat-bubble-primary" : "chat-bubble-neutral"
                }`}
              >
                {message.content}
              </div>

              {isDiagnosis && (
                <div className="mt-3 w-full max-w-xl">
                  <div className="flex gap-2">
                    <button
                      className="btn btn-success flex-1"
                      disabled={!canRecord || isRecordingDiagnosis}
                      onClick={() => {
                        if (!message.tempDiagnosis) return;
                        executeCreateDiagnosis({
                          chatId,
                          messageId: message.id,
                          confidence: message.tempDiagnosis.confidence,
                          uncertainty: message.tempDiagnosis.uncertainty,
                          disease: message.tempDiagnosis.disease,
                          modelUsed: message.tempDiagnosis.modelUsed,
                          symptoms: message.tempDiagnosis.symptoms,
                          location: location || undefined,
                        });
                      }}
                    >
                      {isRecordingDiagnosis && canRecord ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Record diagnosis
                    </button>

                    <ViewInsightsBtn
                      disabled={!hasExplanation}
                      modalId={modalId}
                    />
                  </div>
                  {!isFinalized &&
                  message.id !== latestRecordableMessageId &&
                  message.tempDiagnosis ? (
                    <p className="mt-2 text-xs opacity-70">
                      Only the latest diagnosis can be recorded.
                    </p>
                  ) : null}
                  {isFinalized ? (
                    <p className="mt-2 text-xs opacity-70">
                      This chat is finalized after recording.
                    </p>
                  ) : null}
                  <InsightsModal
                    id={modalId}
                    tokens={message.explanation?.tokens}
                    importances={message.explanation?.importances}
                  />
                </div>
              )}
            </article>
          );
        })}

        {isProcessingPending ? (
          <div className="alert alert-info">
            <Loader2 className="size-4 animate-spin" />
            <span>Generating diagnosis and explanation...</span>
          </div>
        ) : null}
      </div>

      <div className="bottom-0 sticky mt-8 pt-4 bg-base-200/70 backdrop-blur">
        <div className="flex items-start gap-2 border border-base-300 rounded-box p-2">
          <textarea
            className="textarea flex-1 h-16 min-h-16 resize-none"
            placeholder={
              isFinalized
                ? "Diagnosis already recorded for this chat."
                : "Describe additional symptoms..."
            }
            value={symptoms}
            disabled={isFinalized || isBusy}
            onChange={(event) => setSymptoms(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !(event.nativeEvent as any)?.isComposing
              ) {
                event.preventDefault();
                handleSubmitSymptoms();
              }
            }}
          />
          <button
            type="button"
            className="btn btn-primary btn-square"
            disabled={isFinalized || isBusy || !symptoms.trim()}
            onClick={handleSubmitSymptoms}
            aria-label="Send symptoms"
          >
            {isSubmittingSymptoms ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ArrowUp className="size-5" />
            )}
          </button>
        </div>
      </div>
    </section>
  );
};

export default DiagnosisChatClient;
