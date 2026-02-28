import { Suspense } from "react";
import { getChats } from "@/utils/chat";
import { getCurrentDbUser } from "@/utils/user";
import { columns, HistoryRow } from "@/components/patient/history-page/columns";
import { DataTable } from "@/components/patient/history-page/data-table";

async function ChatHistoryList() {
  const { success: dbUser, error: userError } = await getCurrentDbUser();

  if (userError || !dbUser) {
    throw new Error(userError || "Failed to load user");
  }

  // Include messages, diagnosis, and tempDiagnoses to avoid N+1 queries
  // tempDiagnoses doesn't order by createdAt automatically in include, so we sort it below
  const { success: chats, error } = await getChats(dbUser.id, {
    messages: true,
    diagnosis: true,
    tempDiagnoses: true,
  });

  if (error || !chats) {
    throw new Error(error || "Failed to load chats");
  }

  if (chats.length === 0) {
    return (
      <p className="text-muted text-lg mt-8 text-center">
        You don't have any diagnosis history yet.
      </p>
    );
  }

  const rows: HistoryRow[] = chats.map((chat) => {
    let diagnosis = "";
    let uncertainty: number | null = null;
    let confidence: number | null = null;
    let modelUsed: string | null = null;

    if (chat.hasDiagnosis && chat.diagnosis) {
      diagnosis = chat.diagnosis.disease
        .toString()
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
      uncertainty = chat.diagnosis.uncertainty;
      confidence = chat.diagnosis.confidence;
      modelUsed = chat.diagnosis.modelUsed;
    } else if (chat.tempDiagnoses && chat.tempDiagnoses.length > 0) {
      const latestTemp = [...chat.tempDiagnoses].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      diagnosis = latestTemp.disease
        .toString()
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
      uncertainty = latestTemp.uncertainty;
      confidence = latestTemp.confidence;
      modelUsed = latestTemp.modelUsed;
    } else {
      const messages = chat.messages || [];
      const latestMessageContentRaw =
        messages.length > 0
          ? [...messages].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0].content
          : "";

      diagnosis =
        latestMessageContentRaw.length > 120
          ? `${latestMessageContentRaw.slice(0, 120)}…`
          : latestMessageContentRaw;
    }

    return {
      id: chat.chatId,
      diagnosis: diagnosis || "No details available",
      uncertainty,
      confidence,
      modelUsed,
      createdAt: chat.createdAt,
    };
  });

  return (
    <div className="animate-fade-in w-full">
      <DataTable columns={columns} data={rows} />
    </div>
  );
}

function ChatHistorySkeleton() {
  return (
    <div className="space-y-4">
      {/* Search Bar Skeleton */}
      <div className="flex gap-4">
        <div className="skeleton h-10 w-72 rounded-lg" />
        <div className="skeleton h-10 w-48 rounded-lg" />
      </div>
      {/* Table Skeleton */}
      <div className="border border-border rounded-xl">
        <div className="h-12 border-b border-border bg-base-200/50" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 border-b border-border/50 px-6 py-4 flex items-center justify-between">
            <div className="skeleton h-5 w-1/3" />
            <div className="skeleton h-5 w-24" />
            <div className="skeleton h-5 w-24" />
            <div className="skeleton h-8 w-24 rounded" />
          </div>
        ))}
      </div>
    </div>
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
