import { Message } from "@/app/generated/prisma";
import { TempDiagnosis } from "@/types";
import { cn } from "@/utils/lib";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";

type ChatBubbleProps = {
  messagesLength: number;
  idx?: number;
  tempDiagnosis?: TempDiagnosis;
} & Message;

const ChatBubble = ({
  content,
  role,
  type,
  messagesLength,
  idx,
  tempDiagnosis,
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
      {type === "DIAGNOSIS" && (
        <div className="flex gap-2 mt-4">
          <button
            disabled={!tempDiagnosis || messagesLength - 1 !== idx}
            className="flex-1 btn"
            onClick={() => console.log({ tempDiagnosis })}
          >
            Yes
          </button>
        </div>
      )}
    </article>
  );
};

export default ChatBubble;
