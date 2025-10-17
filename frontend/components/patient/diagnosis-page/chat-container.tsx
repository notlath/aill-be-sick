import ChatBubble from "./chat-bubble";
import { Message } from "@/app/generated/prisma";

type ChatContainerProps = {
  messages: Message[];
};

const ChatContainer = ({ messages }: ChatContainerProps) => {
  return (
    <section className="flex flex-col flex-1 space-y-2 px-44 py-8">
      {messages.map((message) => (
        <ChatBubble key={message.id + message.content} {...message} />
      ))}
    </section>
  );
};

export default ChatContainer;
