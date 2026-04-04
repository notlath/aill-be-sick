"use client";

import { Chat, Explanation, Message } from "@/lib/generated/prisma";
import { Explanation as TempExplanation } from "@/types";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import ChatContainer from "./chat-container";
import BmiAdviceSection from "./bmi-advice-section";

const CDSSSummary = dynamic(() => import("./cdss-summary"));

type ChatHistoryViewProps = {
  chatId: string;
  messages: (Message & { explanation?: Explanation | null })[];
  chat: Chat;
  dbExplanation: Explanation | null;
  userRole?: string;
  dbCdss?: any | null;
  dbConfidence?: number | null;
  dbUncertainty?: number | null;
  dbIsValid?: boolean | null;
  diagnosisId?: number;
  initialBmiData?: {
    heightCm: number | null;
    weightKg: number | null;
    bmiAdvice: string | null;
  };
};

/**
 * Read-only view for completed diagnoses (viewed from history or after recording).
 *
 * This component has ZERO diagnosis/follow-up logic — no runDiagnosis,
 * no getFollowUpQuestion, no createMessage. It simply renders the stored
 * messages. This architectural separation guarantees that viewing a saved
 * diagnosis can never re-trigger the diagnosis engine.
 */
const ChatHistoryView = ({
  chatId,
  messages,
  chat,
  dbExplanation,
  userRole,
  dbCdss,
  dbConfidence,
  dbUncertainty,
  dbIsValid,
  diagnosisId,
  initialBmiData,
}: ChatHistoryViewProps) => {
  const processedMessages = useMemo(
    () =>
      messages.map((msg) => ({
        ...msg,
        explanation: msg.explanation || dbExplanation,
      })),
    [messages, dbExplanation],
  );

  return (
    <div className="space-y-4">
      <ChatContainer
        messages={processedMessages as any}
        isGettingQuestion={false}
        isDiagnosing={false}
        isGettingExplanations={false}
        isCreatingMessage={false}
        hasDiagnosis={chat.hasDiagnosis}
        currentQuestion={null}
        dbExplanation={dbExplanation as unknown as TempExplanation}
        userRole={userRole}
      />
      {dbCdss && (
        <div className="w-full max-w-[768px] mx-auto px-4">
          <CDSSSummary
            cdss={dbCdss}
            confidence={dbConfidence ?? undefined}
            uncertainty={dbUncertainty ?? undefined}
            isValid={dbIsValid ?? undefined}
          />
        </div>
      )}
      {diagnosisId && (
        <div className="w-full max-w-[768px] mx-auto px-4 pb-8">
          <BmiAdviceSection
            diagnosisId={diagnosisId}
            initialData={initialBmiData}
          />
        </div>
      )}
    </div>
  );
};

export default ChatHistoryView;
