import ChatHistoryView from "@/components/patient/diagnosis-page/chat-history-view";
import ChatWindow from "@/components/patient/diagnosis-page/chat-window";
import ThreadTransition from "@/components/patient/diagnosis-page/thread-transition";
import { Chat } from "@/lib/generated/prisma";
import { getChatById } from "@/utils/chat";
import { getDiagnosisByChatId, getTempDiagnosisRecoveryState } from "@/utils/diagnosis";
import { getExplanationByChatId, getExplanationByDiagnosisId } from "@/utils/explanation";
import { getMessagesByChatId } from "@/utils/message";
import { getCurrentDbUser } from "@/utils/user";
import { notFound } from "next/navigation";
import { Suspense } from "react";

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

const ChatDataLoader = async ({
  chatId,
  chat,
  userRole,
}: {
  chatId: string;
  chat: Chat;
  userRole?: string;
}) => {
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
    throw new Error(
      typeof messagesError === "string"
        ? messagesError
        : "Failed to load messages",
    );
  }

  if (diagnosisError) {
    throw new Error(
      typeof diagnosisError === "string"
        ? diagnosisError
        : "Failed to load diagnosis",
    );
  }

  // For completed chats (hasDiagnosis=true), fetch explanation by diagnosis ID
  // For active chats (hasDiagnosis=false), fetch explanation by chat ID
  // (explanation may exist but Diagnosis record doesn't yet)
  let explanation = null;
  if (diagnosis) {
    const { success: exp, error: expError } = await getExplanationByDiagnosisId(
      diagnosis.id,
    );
    if (expError) {
      throw new Error(
        typeof expError === "string" ? expError : "Failed to load explanation",
      );
    }
    explanation = exp;
  } else {
    // Active chat: try to fetch explanation by chat ID
    // This handles the case where explanation exists but Diagnosis isn't recorded yet
    const { success: exp, error: expError } = await getExplanationByChatId(
      chatId,
    );
    if (expError) {
      throw new Error(
        typeof expError === "string" ? expError : "Failed to load explanation",
      );
    }
    explanation = exp;
  }

  // Check for limbo state: TempDiagnosis exists with explanation but no permanent Diagnosis.
  // This can happen if auto-record fails (e.g. transient DB error).
  const { success: recoveryState } = !chat.hasDiagnosis
    ? await getTempDiagnosisRecoveryState(chatId)
    : { success: null };

  // Decide rendering mode: if the chat already has a recorded diagnosis,
  // render the lightweight read-only history view. This component has zero
  // diagnosis/follow-up logic so it can never re-trigger the diagnosis engine.
  const isCompleted = chat.hasDiagnosis;

  if (isCompleted) {
    return (
      <ChatHistoryView
        key={chatId}
        dbExplanation={explanation ?? null}
        chatId={chatId}
        messages={messages}
        chat={chat}
        userRole={userRole}
        dbCdss={(diagnosis as any)?.cdss ?? null}
        dbConfidence={diagnosis?.confidence ?? null}
        dbUncertainty={diagnosis?.uncertainty ?? null}
        dbIsValid={diagnosis?.isValid ?? null}
        diagnosisId={diagnosis?.id}
        initialBmiData={{
          heightCm: diagnosis?.heightCm ?? null,
          weightKg: diagnosis?.weightKg ?? null,
          bmiAdvice: diagnosis?.bmiAdvice ?? null,
        }}
      />
    );
  }

  return (
    <ChatWindow
      key={chatId}
      dbExplanation={explanation ?? null}
      chatId={chatId}
      messages={messages}
      chat={chat}
      userRole={userRole}
      needsRecovery={recoveryState?.needsRecovery ?? false}
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
    throw new Error(
      typeof authError === "string" ? authError : "Not authenticated",
    );
  }

  // We await ONLY the chat to confirm it exists and quickly get layout.
  // Other data is fetched in ChatDataLoader allowing page shell to stream in immediately.
  const { success: chat, error: chatError } = await getChatById(chatId);

  if (!chat) {
    return notFound();
  }

  if (chatError) {
    throw new Error(
      typeof chatError === "string" ? chatError : "Failed to load chat",
    );
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
