import ChatWindow from "@/components/patient/diagnosis-page/chat-window";
import { getChatById } from "@/utils/chat";
import { getDiagnosisByChatId } from "@/utils/diagnosis";
import { getExplanationByDiagnosisId } from "@/utils/explanation";
import { getMessagesByChatId } from "@/utils/message";
import { getCurrentDbUser } from "@/utils/user";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Chat } from "@/lib/generated/prisma";

const ChatSkeleton = () => {
  return (
    <div className="flex flex-col flex-1 space-x-auto space-y-4 py-8 w-full max-w-[768px] mx-auto px-4">
      <div className="skeleton h-16 w-3/4 self-end rounded-2xl"></div>
      <div className="skeleton h-32 w-4/5 self-start rounded-2xl"></div>
      <div className="skeleton h-20 w-1/2 self-end rounded-2xl"></div>
      <div className="skeleton h-40 w-3/4 self-start rounded-2xl"></div>

      <div className="absolute bottom-0 left-0 right-0 bg-base-100 p-4 pt-0 z-10 flex flex-col items-center">
        <div className="flex w-full max-w-[800px] gap-2 items-center">
          <div className="skeleton h-[52px] w-full rounded-xl"></div>
        </div>
      </div>
    </div>
  );
};

const ChatDataLoader = async ({ chatId, chat, userRole }: { chatId: string; chat: Chat; userRole?: string }) => {
  const [
    { success: messages, error: messagesError },
    { success: diagnosis, error: diagnosisError },
  ] = await Promise.all([
    getMessagesByChatId(chatId, {
      tempDiagnosis: true,
      explanation: true,
    }),
    getDiagnosisByChatId(chatId),
  ]);

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
    <ChatWindow
      dbExplanation={explanation ?? null}
      chatId={chatId}
      messages={messages}
      chat={chat}
      userRole={userRole}
    />
  );
};

const ChatPage = async ({
  params,
}: {
  params: Promise<{ chatId: string }>;
  searchParams: Promise<{ symptoms: string }>;
}) => {
  const { chatId } = await params;

  // Enforce auth to preserve previous behavior and setup dynamic constraints
  const { success: dbUser, error: authError } = await getCurrentDbUser();

  if (authError || !dbUser) {
    throw new Error(typeof authError === "string" ? authError : "Not authenticated");
  }

  // We await ONLY the chat to confirm it exists and quickly get layout.
  // Other data is fetched in ChatDataLoader allowing page shell to stream in immediately.
  const { success: chat, error: chatError } = await getChatById(chatId);

  if (!chat) {
    return notFound();
  }

  if (chatError) {
    throw new Error(typeof chatError === "string" ? chatError : "Failed to load chat");
  }

  return (
    <main className="relative flex flex-col items-center h-full w-full">
      <Suspense fallback={<ChatSkeleton />}>
        <ChatDataLoader chatId={chatId} chat={chat} userRole={dbUser.role} />
      </Suspense>
    </main>
  );
};

export default ChatPage;
