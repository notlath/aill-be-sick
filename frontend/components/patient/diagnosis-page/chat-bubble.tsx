import { Message, TempDiagnosis } from "@/lib/generated/prisma";
import { cn } from "@/utils/lib";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import RecordDiagnosisBtn from "./record-diagnosis-btn";
import { LocationData } from "@/utils/location";
import { ChevronDown, ChevronUp, XCircle } from "lucide-react";
import { Explanation } from "@/types";
import ViewInsightsBtn from "./view-insights-btn";
import InsightsModal from "./insights-modal";
import { useState } from "react";

type ChatBubbleProps = {
  messagesLength: number;
  idx?: number;
  tempDiagnosis?: TempDiagnosis;
  chatHasDiagnosis?: boolean;
  location?: LocationData | null;
  isGettingExplanations: boolean;
  explanation: Explanation | null;
  userRole?: string;
} & Message;

const ChatBubble = ({
  content,
  role,
  type,
  messagesLength,
  idx,
  tempDiagnosis,
  chatId,
  chatHasDiagnosis,
  location,
  isGettingExplanations,
  explanation,
  userRole,
}: ChatBubbleProps) => {
  const [showClinicianDetails, setShowClinicianDetails] = useState(false);
  const isError = type === "ERROR";

  // Check if this is a low-confidence final diagnosis for clinicians
  const isLowConfidenceFinal =
    type === "DIAGNOSIS" &&
    tempDiagnosis &&
    (tempDiagnosis.confidence ?? 0) < 0.95;
  const canSeeDetails = userRole === "DEVELOPER" || userRole === "CLINICIAN";
  const shouldShowToggle = isLowConfidenceFinal && canSeeDetails;

  const containerClass = cn(
    "p-3 px-4 rounded-xl max-w-[60%]",
    // Default alignment by role
    role === "USER" ? "self-end" : "self-start",
    // Visual style
    isError
      ? "border border-red-400 bg-red-50 text-red-800"
      : role === "USER"
      ? "bg-primary text-primary-content chat-bubble-user"
      : "bg-gray-100 chat-bubble-ai"
  );

  return (
    <article className={containerClass}>
      {isError && (
        <div className="flex items-center gap-2 mb-1 text-red-700">
          <XCircle className="w-4 h-4" aria-hidden="true" />
          <span className="font-semibold text-sm">Error</span>
        </div>
      )}
      <div>
        <Markdown
          remarkPlugins={[remarkBreaks]}
          components={{
            p: ({ children }) => <p className="my-0">{children}</p>,
            strong: ({ children }) => (
              <strong className="font-bold">{children}</strong>
            ),
          }}
        >
          {content}
        </Markdown>
      </div>
      {shouldShowToggle && (
        <div className="mt-3 border-t border-gray-300 pt-3">
          <button
            onClick={() => setShowClinicianDetails(!showClinicianDetails)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            {showClinicianDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span>
              {showClinicianDetails ? "Hide" : "Show"} details (for clinicians)
            </span>
          </button>
          {showClinicianDetails && tempDiagnosis && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Final assessment:</strong> {tempDiagnosis.disease} (
                confidence {(tempDiagnosis.confidence * 100).toFixed(1)}%)
              </p>
            </div>
          )}
        </div>
      )}
      {type === "DIAGNOSIS" && location && (
        <>
          <RecordDiagnosisBtn
            disabled={
              chatHasDiagnosis ||
              !tempDiagnosis ||
              messagesLength - 1 !== idx ||
              isGettingExplanations ||
              !explanation
            }
            tempDiagnosis={tempDiagnosis}
            chatId={chatId}
            location={location}
          />
          <ViewInsightsBtn disabled={isGettingExplanations || !explanation} />
        </>
      )}
      {explanation && (
        <InsightsModal
          tokens={explanation.tokens}
          importances={explanation.importances}
        />
      )}
    </article>
  );
};

export default ChatBubble;
