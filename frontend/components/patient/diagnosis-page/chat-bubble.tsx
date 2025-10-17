import { cn } from "@/utils/lib";

type ChatBubbleProps = {
  content: string;
  role: "USER" | "AI";
  type: "SYMPTOMS" | "DIAGNOSIS" | "QUESTION" | "ANSWER";
};

const ChatBubble = ({ content, role, type }: ChatBubbleProps) => {
  if (type === "DIAGNOSIS") {
    return (
      <article className="self-start bg-gray-200 p-2 px-3 rounded-xl max-w-[60%]">
        Based on your symptom description, you might be experiencing{" "}
        <span className="font-medium">{content}</span>.
      </article>
    );
  }

  return (
    <article
      className={cn(
        "p-2 px-3 rounded-xl max-w-[60%]",
        role === "USER"
          ? "bg-primary text-primary-content self-end"
          : "bg-gray-200 self-start"
      )}
    >
      {content}
    </article>
  );
};

export default ChatBubble;
