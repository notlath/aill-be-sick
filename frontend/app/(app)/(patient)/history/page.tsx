import { columns, HistoryRow } from "@/components/patient/history-page/columns";
import { DataTable } from "@/components/patient/history-page/data-table";
import { getChats } from "@/utils/chat";
import { getCurrentDbUser } from "@/utils/user";
import { Suspense } from "react";
import { ExportReportButton } from "@/components/ui/export-report-button";
import type { PdfColumn } from "@/utils/pdf-export";

async function ChatHistoryList() {
  const { success: dbUser, error: userError } = await getCurrentDbUser();

  if (userError || !dbUser) {
    throw new Error(userError || "Failed to load user");
  }

  // Include only the latest message (for fallback display), diagnosis, and tempDiagnoses
  // to avoid fetching every Message row. tempDiagnoses doesn't order by createdAt
  // automatically in include, so we sort it below.
  const { success: chats, error } = await getChats(dbUser.id, {
    messages: { take: 1, orderBy: { createdAt: "desc" } },
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
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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
      // Only the latest message is fetched (take: 1, orderBy desc) — no sort needed
      const latestMessageContentRaw = chat.messages?.[0]?.content ?? "";

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

  const pdfColumns: PdfColumn[] = [
    { header: "Diagnosis", dataKey: "diagnosis" },
    { header: "Model", dataKey: "modelUsed" },
    { header: "Uncertainty", dataKey: "uncertainty" },
    { header: "Confidence", dataKey: "confidence" },
    { header: "Date", dataKey: "createdAt" },
  ];

  const exportData = rows.map((row) => ({
    diagnosis: row.diagnosis,
    modelUsed: row.modelUsed || "-",
    uncertainty:
      row.uncertainty !== null ? `${(row.uncertainty * 100).toFixed(2)}%` : "-",
    confidence:
      row.confidence !== null ? `${(row.confidence * 100).toFixed(2)}%` : "-",
    createdAt: new Date(row.createdAt),
  }));

  return (
    <div className="animate-fade-in w-full">
      <DataTable
        columns={columns}
        data={rows}
        additionalActions={
          <ExportReportButton
            data={exportData}
            columns={pdfColumns}
            filenameSlug="diagnosis-history"
            title="Diagnosis History"
            subtitle="Your diagnosis history"
            generatedBy={{
              name: dbUser.name ?? "Unknown",
              email: dbUser.email,
            }}
          />
        }
      />
    </div>
  );
}

function ChatHistorySkeleton() {
  return (
    <div className="space-y-4">
      {/* Search Bar Skeleton */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="skeleton h-10 w-full sm:w-72 rounded-lg" />
        <div className="flex gap-2">
          <div className="skeleton h-10 w-full sm:w-48 rounded-lg" />
          <div className="skeleton h-10 w-full sm:w-40 rounded-lg" />
        </div>
      </div>
      {/* Mobile Card Skeletons */}
      <div className="lg:hidden space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="border border-border/60 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="skeleton h-5 w-40" />
                <div className="skeleton h-3 w-28" />
              </div>
              <div className="skeleton h-5 w-14 rounded" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-1.5 w-full rounded-full" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-1.5 w-full rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Desktop Table Skeleton */}
      <div className="hidden lg:block border border-border rounded-xl">
        <div className="h-12 border-b border-border bg-base-200/50" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-16 border-b border-border/50 px-6 py-4 flex items-center justify-between"
          >
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
    <main className="space-y-8 lg:space-y-10 mx-auto p-4 pt-8 lg:p-8 lg:pt-12 max-w-5xl">
      <div className="space-y-2">
        <h1 className="mb-1 font-semibold text-base-content text-3xl lg:text-4xl tracking-tight">
          Diagnosis history
        </h1>
        <p className="text-muted text-base lg:text-lg">
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
