import ChatWindow from "@/components/patient/diagnosis-page/chat-window";
import { getChatById } from "@/utils/chat";
import { getMessagesByChatId } from "@/utils/message";
import { redirect } from "next/navigation";

const ChatPage = async ({
  params,
}: {
  params: Promise<{ chatId: string }>;
  searchParams: Promise<{ symptoms: string }>;
}) => {
  const { chatId } = await params;
  const { success: chat, error: chatError } = await getChatById(chatId);

  if (!chat) {
    // TODO: Error handling
    return redirect("/diagnosis");
  }

  if (chatError) {
    // TODO: Error handling
    return null;
  }

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
      <ChatWindow chatId={chatId} messages={messages} chat={chat} />
    </main>
  );
};

export default ChatPage;
