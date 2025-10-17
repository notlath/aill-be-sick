import { Message } from "@/app/generated/prisma";
import { cn } from "@/utils/lib";

const ChatBubble = ({ content, role }: Message) => {
  return (
    <article
      className={cn(
        "p-2 px-3 rounded-xl w-max",
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
