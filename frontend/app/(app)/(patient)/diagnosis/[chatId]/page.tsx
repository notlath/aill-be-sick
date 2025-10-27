import ChatWindow from "@/components/patient/diagnosis-page/chat-window";
import { getChatById } from "@/utils/chat";
import { getDiagnosisByChatId } from "@/utils/diagnosis";
import { getExplanationByDiagnosisId } from "@/utils/explanation";
import { getMessagesByChatId } from "@/utils/message";
import { notFound } from "next/navigation";

const ChatPage = async ({
  params,
}: {
  params: Promise<{ chatId: string }>;
  searchParams: Promise<{ symptoms: string }>;
}) => {
  const { chatId } = await params;
  const { success: chat, error: chatError } = await getChatById(chatId);

  if (!chat) {
    return notFound();
  }

  if (chatError) {
    // TODO: Error handling
    return null;
  }

  const { success: messages, error: messagesError } = await getMessagesByChatId(
    chatId,
    {
      tempDiagnosis: true,
      explanation: true,
    }
  );

  if (!messages) {
    // TODO: Error handling
    return null;
  }

  if (messagesError) {
    // TODO: Error handling
    return null;
  }

  const { success: diagnosis, error: diagnosisError } =
    await getDiagnosisByChatId(chatId);

  if (diagnosisError) {
    // TODO: Error handling
    return null;
  }

  const { success: explanation, error: explanationError } = diagnosis
    ? await getExplanationByDiagnosisId(diagnosis.id)
    : { success: null, error: null };

  if (explanationError) {
    // TODO: Error handling
    return null;
  }

  return (
    <main className="relative flex flex-col items-center h-full">
      <ChatWindow
        dbExplanation={explanation ?? null}
        chatId={chatId}
        messages={messages}
        chat={chat}
      />
    </main>
  );
};

export default ChatPage;
