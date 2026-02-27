import ChatWindow from "@/components/patient/diagnosis-page/chat-window";
import { getChatById } from "@/utils/chat";
import { getDiagnosisByChatId } from "@/utils/diagnosis";
import { getExplanationByDiagnosisId } from "@/utils/explanation";
import { getMessagesByChatId } from "@/utils/message";
import { getCurrentDbUser } from "@/utils/user";
import { notFound } from "next/navigation";

const ChatPage = async ({
  params,
}: {
  params: Promise<{ chatId: string }>;
  searchParams: Promise<{ symptoms: string }>;
}) => {
  const { chatId } = await params;

  const [
    { success: dbUser },
    { success: chat, error: chatError },
    { success: messages, error: messagesError },
    { success: diagnosis, error: diagnosisError },
  ] = await Promise.all([
    getCurrentDbUser(),
    getChatById(chatId),
    getMessagesByChatId(chatId, {
      tempDiagnosis: true,
      explanation: true,
    }),
    getDiagnosisByChatId(chatId),
  ]);

  if (!chat) {
    return notFound();
  }

  if (chatError) {
    throw new Error(typeof chatError === "string" ? chatError : "Failed to load chat");
  }

  if (!messages || messagesError) {
    throw new Error(typeof messagesError === "string" ? messagesError : "Failed to load messages");
  }

  if (diagnosisError) {
    throw new Error(typeof diagnosisError === "string" ? diagnosisError : "Failed to load diagnosis");
  }

  const { success: explanation, error: explanationError } = diagnosis
    ? await getExplanationByDiagnosisId(diagnosis.id)
    : { success: null, error: null };

  if (explanationError) {
    throw new Error(typeof explanationError === "string" ? explanationError : "Failed to load explanation");
  }

  return (
    <main className="relative flex flex-col items-center h-full">
      <ChatWindow
        dbExplanation={explanation ?? null}
        chatId={chatId}
        messages={messages}
        chat={chat}
        userRole={dbUser?.role}
      />
    </main>
  );
};

export default ChatPage;
