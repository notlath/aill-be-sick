import ChatWindow from "@/components/patient/diagnosis-page/chat-window";
import { getMessagesByChatId } from "@/utils/message";

const ChatPage = async ({
  params,
}: {
  params: Promise<{ chatId: string }>;
  searchParams: Promise<{ symptoms: string }>;
}) => {
  const { chatId } = await params;
  const { success: messages, error } = await getMessagesByChatId(chatId, {
    tempDiagnosis: true,
  });

  if (!messages) {
    // TODO: Error handling
    return null;
  }

  if (error) {
    // TODO: Error handling
    return null;
  }

  return (
    <main className="relative flex flex-col h-full">
      <ChatWindow chatId={chatId} messages={messages} />
    </main>
  );
};

export default ChatPage;
