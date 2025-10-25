import { Message, TempDiagnosis } from "@/app/generated/prisma";
import { cn } from "@/utils/lib";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import RecordDiagnosisBtn from "./record-diagnosis-btn";
import { LocationData } from "@/utils/location";

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
  return (
    <article
      className={cn(
        "p-3 px-4 rounded-xl max-w-[60%]",
        role === "USER"
          ? "bg-primary text-primary-content self-end"
          : "bg-gray-200 self-start"
      )}
    >
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
