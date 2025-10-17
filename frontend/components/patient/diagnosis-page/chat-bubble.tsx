import { cn } from "@/utils/lib";
import Markdown from "react-markdown";

type ChatBubbleProps = {
  content: string;
  role: "USER" | "AI";
  type: "SYMPTOMS" | "DIAGNOSIS" | "QUESTION" | "ANSWER";
};

const ChatBubble = ({ content, role, type }: ChatBubbleProps) => {
  return (
    <article
      className={cn(
        "p-2 px-3 rounded-xl max-w-[60%]",
        role === "USER"
          ? "bg-primary text-primary-content self-end"
          : "bg-gray-200 self-start"
      )}
    >
      <div>
        <Markdown
          components={{
            p: ({ children }) => <p className="mb-0">{children}</p>,
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
          <div className="flex-1 btn">Yes</div>
        </div>
      )}
    </article>
  );
};

export default ChatBubble;
