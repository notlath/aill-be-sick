import { getMessagesByChatId } from "@/utils/message";
import ChatBubble from "./chat-bubble";

type ChatContainerProps = {
  chatId: string;
};

const ChatContainer = async ({ chatId }: ChatContainerProps) => {
  const { success: messages, error } = await getMessagesByChatId(chatId);

  if (!messages) {
    // TODO: Error handling
    return null;
  }

  if (error) {
    // TODO: Error handling
    return null;
  }

  return (
    <section className="flex flex-col flex-1 px-52 py-8">
      {messages.map((message) => (
        <ChatBubble key={message.id} {...message} />
      ))}
    </section>
  );
};

export default ChatContainer;
