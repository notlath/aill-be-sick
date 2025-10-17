import { cn } from "@/utils/lib";

type ChatBubbleProps = {
  content: string;
  role: "USER" | "AI";
};

const ChatBubble = ({ content, role }: ChatBubbleProps) => {
  return (
    <article
      className={cn(
        "p-2 px-3 rounded-xl w-max max-w-[60%]",
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
