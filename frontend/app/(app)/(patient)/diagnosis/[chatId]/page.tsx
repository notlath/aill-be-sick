import DiagnosisChatClient from "@/components/patient/diagnosis-page/diagnosis-chat-client";
import prisma from "@/prisma/prisma";
import { getCurrentDbUser } from "@/utils/user";
import { notFound, redirect } from "next/navigation";

const ChatPage = async ({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) => {
  const { chatId } = await params;
  const { success: dbUser } = await getCurrentDbUser();

  if (!dbUser) {
    redirect("/login");
  }

  const chat = await prisma.chat.findUnique({
    where: { chatId },
    select: {
      chatId: true,
      userId: true,
      hasDiagnosis: true,
    },
  });

  if (!chat) {
    notFound();
  }

  if (chat.userId !== dbUser.id) {
    redirect(`/diagnosis/${chatId}/unauthorized`);
  }

  const messages = await prisma.message.findMany({
    where: { chatId },
    include: {
      tempDiagnosis: true,
      explanation: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "USER");
  const latestDiagnosisMessage = [...messages]
    .reverse()
    .find((message) => message.role === "AI" && message.type === "DIAGNOSIS");

  const hasPendingUserMessage = Boolean(
    latestUserMessage &&
      (!latestDiagnosisMessage ||
        latestDiagnosisMessage.createdAt < latestUserMessage.createdAt ||
        (latestDiagnosisMessage.createdAt.getTime() ===
          latestUserMessage.createdAt.getTime() &&
          latestDiagnosisMessage.id < latestUserMessage.id)),
  );

  const serializedMessages = messages.map((message) => ({
    ...message,
    createdAt: message.createdAt.toISOString(),
    tempDiagnosis: message.tempDiagnosis
      ? {
          ...message.tempDiagnosis,
          createdAt: message.tempDiagnosis.createdAt.toISOString(),
        }
      : null,
    explanation: message.explanation
      ? {
          ...message.explanation,
          createdAt: message.explanation.createdAt.toISOString(),
        }
      : null,
  }));

  return (
    <main className="relative flex flex-col h-full w-full">
      <DiagnosisChatClient
        chatId={chat.chatId}
        hasDiagnosis={chat.hasDiagnosis}
        hasPendingUserMessage={hasPendingUserMessage}
        latestDiagnosisMessageId={latestDiagnosisMessage?.id ?? null}
        initialMessages={serializedMessages}
      />
    </main>
  );
};

export default ChatPage;
