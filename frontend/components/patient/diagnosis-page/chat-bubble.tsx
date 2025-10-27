import { Message, TempDiagnosis } from "@/app/generated/prisma";
import { cn } from "@/utils/lib";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import RecordDiagnosisBtn from "./record-diagnosis-btn";
import { LocationData } from "@/utils/location";
import { XCircle } from "lucide-react";
import { Explanation } from "@/types";
import ViewInsightsBtn from "./view-insights-btn";
import InsightsModal from "./insights-modal";

type ChatBubbleProps = {
  messagesLength: number;
  idx?: number;
  tempDiagnosis?: TempDiagnosis;
  chatHasDiagnosis?: boolean;
  location?: LocationData | null;
  isGettingExplanations: boolean;
  explanation: Explanation | null;
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
}: ChatBubbleProps) => {
  const isError = type === "ERROR";

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
