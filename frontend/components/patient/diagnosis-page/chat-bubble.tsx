import { Message, TempDiagnosis } from "@/app/generated/prisma";
import { cn } from "@/utils/lib";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import RecordDiagnosisBtn from "./record-diagnosis-btn";
import { LocationData } from "@/utils/location";
import { XCircle } from "lucide-react";

type ChatBubbleProps = {
  messagesLength: number;
  idx?: number;
  tempDiagnosis?: TempDiagnosis;
  chatHasDiagnosis?: boolean;
  location?: LocationData | null;
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
      ? "bg-primary text-primary-content"
      : "bg-gray-200"
  );

  return (
    <article className={containerClass}>
      {isError && (
        <div className="mb-1 flex items-center gap-2 text-red-700">
          <XCircle className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-semibold">Error</span>
        </div>
      )}
      <div>
        <Markdown
          remarkPlugins={[remarkBreaks]}
          components={{
            p: ({ children }) => <p className="my-2">{children}</p>,
            strong: ({ children }) => (
              <strong className="font-bold">{children}</strong>
            ),
          }}
        >
          {content}
        </Markdown>
      </div>
      {type === "DIAGNOSIS" && location && (
        <RecordDiagnosisBtn
          disabled={
            chatHasDiagnosis || !tempDiagnosis || messagesLength - 1 !== idx
          }
          tempDiagnosis={tempDiagnosis}
          chatId={chatId}
          location={location}
        />
      )}
    </article>
  );
};

export default ChatBubble;
