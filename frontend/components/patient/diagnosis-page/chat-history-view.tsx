"use client";

import {
  Chat,
  Explanation,
  Message,
  TempDiagnosis,
} from "@/lib/generated/prisma";
import { Explanation as TempExplanation } from "@/types";
import { getSymptomIdsFromQuestionIds } from "@/utils/clinical-verification";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import ChatContainer from "./chat-container";
// TODO: Commented out BMI Advice feature
// import BmiAdviceSection from "./bmi-advice-section";
import InsightsModal from "./insights-modal";

const CDSSSummary = dynamic(() => import("./cdss-summary"));
const ClinicalVerificationCard = dynamic(
  () => import("@/components/shared/clinical-verification-card"),
  { ssr: false }
);

type ChatHistoryViewProps = {
  chatId: string;
  messages: (Message & {
    explanation?: Explanation | null;
    tempDiagnosis?: TempDiagnosis | null;
  })[];
  chat: Chat;
  dbExplanation: Explanation | null;
  userRole?: string;
  dbCdss?: any | null;
  dbConfidence?: number | null;
  dbUncertainty?: number | null;
  dbIsValid?: boolean | null;
  diagnosisDisease?: string | null;
  clinicalVerificationStatus?: string | null;
  clinicalVerification?: unknown;
  diagnosisId?: number;
  // TODO: Commented out BMI Advice feature
  // initialBmiData?: {
  //   heightCm: number | null;
  //   weightKg: number | null;
  //   bmiAdvice: string | null;
  // };
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
  diagnosisDisease,
  clinicalVerificationStatus,
  clinicalVerification,
  diagnosisId,
  // TODO: Commented out BMI Advice feature
  // initialBmiData,
}: ChatHistoryViewProps) => {
  // Extract the diagnosis message content, symptoms text, disease name, and explanation data
  const {
    chatMessages,
    diagnosisMessage,
    symptomsText,
    diseaseName,
    insightData,
  } = useMemo(() => {
    const diagMsg = messages.find((m) => m.type === "DIAGNOSIS");
    const symptomsMsg = messages.find((m) => m.type === "SYMPTOMS");
    const chatMsgs = messages.filter((m) => m.type !== "DIAGNOSIS");

    // Extract disease name from the CDSS recommendation rationale
    // Format: "Primary: {disease}"
    const diseaseFromRationale = dbCdss?.recommendation?.rationale
      ?.find((r: string) => r.startsWith("Primary:"))
      ?.replace("Primary: ", "");

    // Fallback: extract from diagnosis message content (between ** markers)
    const diseaseFromMsg = diagMsg?.content?.match(/\*\*(.+?)\*\*/)?.[1];

    return {
      chatMessages: chatMsgs.map((msg) => ({
        ...msg,
        explanation: msg.explanation || dbExplanation,
      })),
      diagnosisMessage: diagMsg?.content ?? null,
      symptomsText: symptomsMsg?.content ?? "",
      diseaseName: diseaseFromRationale ?? diseaseFromMsg ?? "",
      // Use the dbExplanation or the last message's explanation for insights
      insightData: dbExplanation ?? diagMsg?.explanation ?? null,
    };
  }, [messages, dbExplanation, dbCdss]);

  // Show CDSS summary only if we have CDSS data and the diagnosis is valid.
  // We do NOT show the CDSS/Verification checklist for inconclusive/invalid diagnoses.
  const shouldShowCdss = dbCdss && dbIsValid !== false;

  return (
    <div className="space-y-4">
      <ChatContainer
        messages={chatMessages as any}
        isGettingQuestion={false}
        isDiagnosing={false}
        isGettingExplanations={false}
        isCreatingMessage={false}
        hasDiagnosis={chat.hasDiagnosis}
        currentQuestion={null}
        dbExplanation={dbExplanation as unknown as TempExplanation}
        userRole={userRole}
      />
      {shouldShowCdss &&
        (() => {
          const extractedSymptomIds = diagnosisDisease
            ? getSymptomIdsFromQuestionIds(
                diagnosisDisease,
                dbCdss?.extracted_symptoms ?? [],
              )
            : [];

          return (
            <div className="w-full max-w-[768px] mx-auto px-4 space-y-4">
              <CDSSSummary
                cdss={dbCdss}
                confidence={dbConfidence ?? undefined}
                uncertainty={dbUncertainty ?? undefined}
                isValid={dbIsValid ?? undefined}
                diagnosisMessage={diagnosisMessage}
                verificationStatus={clinicalVerificationStatus}
              />
              {diagnosisDisease && (
                <ClinicalVerificationCard
                  disease={diagnosisDisease}
                  chatId={chatId}
                  verificationStatus={clinicalVerificationStatus}
                  verificationPayload={clinicalVerification}
                  extractedSymptomIds={extractedSymptomIds}
                  readOnly={false}
                  defaultExpanded={false}
                />
              )}
            </div>
          );
        })()}
      {/* TODO: Commented out BMI Advice feature
      {diagnosisId && (
        <div className="w-full max-w-[768px] mx-auto px-4 pb-8">
          <BmiAdviceSection
            diagnosisId={diagnosisId}
            initialData={initialBmiData}
          />
        </div>
      )}
      */}

      {/* Insights modal — rendered here so the CDSS button can open it */}
      {insightData && (
        <InsightsModal
          tokens={insightData.tokens}
          importances={insightData.importances}
          disease={diseaseName}
          symptoms={symptomsText}
        />
      )}
    </div>
  );
};

export default ChatHistoryView;
