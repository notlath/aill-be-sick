import { Suspense } from "react";
import DiagnosisLink from "@/components/patient/history-page/diagnosis-link";
import { getChats } from "@/utils/chat";
import { getCurrentDbUser } from "@/utils/user";

async function ChatHistoryList() {
  const { success: dbUser, error: userError } = await getCurrentDbUser();

  if (userError || !dbUser) {
    throw new Error(userError || "Failed to load user");
  }

  const { success: chats, error } = await getChats(dbUser.id, { messages: true });

  if (error || !chats) {
    // Let Next.js Error Boundary handle this error
    throw new Error(error || "Failed to load chats");
  }

  if (chats.length === 0) {
    return (
      <p className="text-muted text-lg mt-8 text-center">
        You don't have any diagnosis history yet.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      {chats.map((chat) => (
        <DiagnosisLink key={chat.id} {...chat} />
      ))}
    </section>
  );
}

function ChatHistorySkeleton() {
  return (
    <section className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-[70px] w-full rounded-2xl"
        />
      ))}
    </section>
  );
}

const HistoryPage = async () => {
  return (
    <main className="space-y-10 mx-auto p-8 pt-12 max-w-5xl">
      <div className="space-y-2">
        <h1 className="mb-1 font-semibold text-base-content text-4xl tracking-tight">
          Diagnosis history
        </h1>
        <p className="text-muted text-lg">
          You can view all your previous diagnoses and their details here.
        </p>
      </div>

      <Suspense fallback={<ChatHistorySkeleton />}>
        <ChatHistoryList />
      </Suspense>
    </main>
  );
};

export default HistoryPage;
