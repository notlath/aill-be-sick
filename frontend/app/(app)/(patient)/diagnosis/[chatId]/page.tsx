import ChatWindow from "@/components/patient/diagnosis-page/chat-window";
import ThreadTransition from "@/components/patient/diagnosis-page/thread-transition";
import { getChatById } from "@/utils/chat";
import { getDiagnosisByChatId } from "@/utils/diagnosis";
import { getExplanationByDiagnosisId } from "@/utils/explanation";
import { getMessagesByChatId } from "@/utils/message";
import { getCurrentDbUser } from "@/utils/user";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Chat } from "@/lib/generated/prisma";

const ChatSkeleton = ({ pendingSymptoms }: { pendingSymptoms?: string }) => {
  return (
    <ThreadTransition className="w-full flex justify-center">
      <div className="flex flex-col flex-1 space-y-3 py-8 w-full max-w-[768px] mx-auto px-3 sm:px-4">
        <article className="self-end bg-primary text-primary-content px-4 py-3 rounded-xl max-w-[85%] whitespace-pre-wrap break-words">
          {pendingSymptoms || "Analyzing your symptoms..."}
        </article>

        <article className="self-start bg-base-200 px-4 py-3 rounded-xl max-w-[60%]">
          <span className="loading loading-dots loading-sm"></span>
        </article>
      </div>
    </ThreadTransition>
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
      key={chatId}
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
  searchParams,
}: {
  params: Promise<{ chatId: string }>;
  searchParams: Promise<{ symptoms?: string }>;
}) => {
  const { chatId } = await params;
  const resolvedSearchParams = await searchParams;
  const pendingSymptoms = resolvedSearchParams?.symptoms || "";

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
      <Suspense fallback={<ChatSkeleton pendingSymptoms={pendingSymptoms} />}>
        <ChatDataLoader chatId={chatId} chat={chat} userRole={dbUser.role} />
      </Suspense>
    </main>
  );
};

export default ChatPage;
