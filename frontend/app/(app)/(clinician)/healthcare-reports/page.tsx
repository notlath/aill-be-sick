import { Suspense } from "react";
import { getAllDiagnoses } from "@/utils/diagnosis";
import { DataTable } from "@/components/clinicians/healthcare-reports-page/data-table";
import { columns } from "@/components/clinicians/healthcare-reports-page/columns";
import { getReliability } from "@/utils/reliability";
import { ExportPdfButton } from "@/components/ui/export-pdf-button";
import { PdfColumn } from "@/utils/pdf-export";

export default function HealthcareReports() {
  return (
    <main className="from-base-100 via-base-200/30 to-base-100 min-h-screen bg-gradient-to-br">
      {/* Hero Header Section */}
      <div className="px-8 pt-12 pb-8 md:px-16 lg:px-24">
        <div className="mx-auto max-w-[1600px]">
          <div className="animate-fade-in space-y-3">
            <h1 className="from-base-content via-base-content to-base-content/70 bg-gradient-to-br bg-clip-text text-6xl font-semibold tracking-tight text-transparent">
              Healthcare Reports
            </h1>
            <p className="text-muted text-lg">
              All healthcare reports in the system
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 pb-16 md:px-16 lg:px-24">
        <div className="mx-auto max-w-[1600px] space-y-8">
          <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
            <Suspense fallback={<TableSkeleton />}>
              <DiagnosesData />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}

async function DiagnosesData() {
  const { success: diagnoses, error } = await getAllDiagnoses({});

  if (error) {
    throw new Error(
      typeof error === "string" ? error : "Failed to load healthcare reports"
    );
  }

  const pdfColumns: PdfColumn[] = [
    { header: "Disease", dataKey: "disease" },
    { header: "Patient", dataKey: "patientName" },
    { header: "District", dataKey: "district" },
    { header: "Barangay", dataKey: "barangay" },
    { header: "Symptoms", dataKey: "symptoms" },
    { header: "Reliability", dataKey: "reliability" },
    { header: "Date", dataKey: "createdAt" },
  ];

  const exportData = (diagnoses || []).map((d) => ({
    disease: d.disease,
    patientName: (d as any).user?.name ?? "Unknown",
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
        <ExportPdfButton
          data={exportData}
          columns={pdfColumns}
          filename="healthcare-reports"
          title="Healthcare Reports"
          subtitle="All diagnoses in the system"
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
          <div key={i} className="h-16 border-b border-border/50 px-6 py-4 flex items-center justify-between">
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
