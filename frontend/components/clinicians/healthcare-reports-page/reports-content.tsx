import { Suspense } from "react";
import { getAllDiagnoses } from "@/utils/diagnosis";
import { DataTable } from "@/components/clinicians/healthcare-reports-page/data-table";
import { columns } from "@/components/clinicians/healthcare-reports-page/columns";
import { getAnonymizedPatientId } from "@/utils/patient";
import { getReliability } from "@/utils/reliability";
import { getCurrentDbUser } from "@/utils/user";
import { ExportReportButton } from "@/components/ui/export-report-button";
import type { PdfColumn } from "@/utils/pdf-export";

export default function ReportsContent() {
  return (
    <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
      <Suspense fallback={<TableSkeleton />}>
        <DiagnosesData />
      </Suspense>
    </div>
  );
}

async function DiagnosesData() {
  const [{ success: diagnoses, error }, { success: dbUser }] = await Promise.all([
    getAllDiagnoses({}),
    getCurrentDbUser(),
  ]);

  if (error) {
    throw new Error(
      typeof error === "string" ? error : "Failed to load healthcare reports",
    );
  }

  const generatedBy = dbUser
    ? { name: dbUser.name ?? "Unknown", email: dbUser.email }
    : undefined;

  const pdfColumns: PdfColumn[] = [
    { header: "Disease", dataKey: "disease" },
    { header: "Patient ID", dataKey: "patientId" },
    { header: "District", dataKey: "district" },
    { header: "Barangay", dataKey: "barangay" },
    { header: "Symptoms", dataKey: "symptoms" },
    { header: "Reliability", dataKey: "reliability" },
    { header: "Date", dataKey: "createdAt" },
  ];

  const exportData = (diagnoses || []).map((d) => ({
    disease: d.disease,
    patientId: getAnonymizedPatientId(d.userId),
    district: d.district ?? "—",
    barangay: d.barangay ?? "—",
    symptoms: d.symptoms,
    reliability: getReliability(d.confidence, d.uncertainty).label,
    createdAt: new Date(d.createdAt),
  }));

  return (
    <DataTable
      columns={columns}
      data={diagnoses || []}
      additionalActions={
        <ExportReportButton
          key="export-report"
          data={exportData}
          columns={pdfColumns}
          filenameSlug="healthcare-reports"
          title="Healthcare Reports"
          subtitle="All diagnoses in the system"
          generatedBy={generatedBy}
        />
      }
    />
  );
}

// Static shell - instant from CDN / Server
function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        {/* Top row: search */}
        <div className="flex w-full">
          <div className="skeleton h-10 flex-1 min-w-48 rounded-lg" />
        </div>
        
        {/* Controls row */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="skeleton h-10 w-48 rounded-lg" />
          <div className="skeleton h-10 w-44 rounded-lg" />
          <div className="skeleton h-10 w-44 rounded-lg" />
          <div className="skeleton h-10 w-[150px] rounded-lg" />
          <div className="skeleton h-10 w-[150px] rounded-lg" />
          <div className="skeleton h-10 w-32 rounded-lg ml-auto" />
        </div>
      </div>
      {/* Table Skeleton */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="h-12 border-b border-border bg-base-200/50" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-16 border-b border-border/50 px-6 py-4 flex items-center justify-between"
          >
            <div className="skeleton h-5 w-1/4" />
            <div className="skeleton h-5 w-1/4" />
            <div className="skeleton h-5 w-24" />
            <div className="skeleton h-8 w-24 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
