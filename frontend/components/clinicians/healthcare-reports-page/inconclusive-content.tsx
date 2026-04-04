import { Suspense } from "react";
import { connection } from "next/server";
import { getInconclusiveDiagnoses, getInconclusiveDiagnosesCount } from "@/utils/diagnosis";
import { InconclusiveDataTable } from "./inconclusive-data-table";
import { inconclusiveColumns } from "./inconclusive-columns";
import { getAnonymizedPatientId } from "@/utils/patient";
import { HelpCircle, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function InconclusiveContent() {
  return (
    <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
      <Suspense fallback={<TableSkeleton />}>
        <InconclusiveDiagnosesData />
      </Suspense>
    </div>
  );
}

async function InconclusiveDiagnosesData() {
  await connection();

  const [
    { success: diagnoses, error: diagnosesError },
    { success: count, error: countError },
  ] = await Promise.all([
    getInconclusiveDiagnoses({}),
    getInconclusiveDiagnosesCount(),
  ]);

  if (diagnosesError) {
    throw new Error(
      typeof diagnosesError === "string" ? diagnosesError : "Failed to load inconclusive diagnoses",
    );
  }

  if (countError) {
    console.error("Failed to load inconclusive count:", countError);
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="alert alert-warning">
        <HelpCircle className="size-5" />
        <div>
          <p className="font-medium">Inconclusive AI Assessments</p>
          <p className="text-sm">
            These assessments could not reach a confident diagnosis. The AI model was unable to 
            determine a likely condition based on the symptoms provided. Patients were advised 
            to consult a healthcare provider.
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
            <CardTitle className="text-sm font-medium text-base-content/60">
              Inconclusive Cases
            </CardTitle>
            <HelpCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="text-2xl font-bold">{count ?? 0}</div>
            <p className="text-xs text-base-content/60 mt-1">
              Awaiting clinical review
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow bg-base-200/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
            <CardTitle className="text-sm font-medium text-base-content/60">
              Recommended Action
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <p className="text-sm text-base-content/70">
              Review symptoms and either verify the AI suggestion or override with your clinical assessment.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      {diagnoses && diagnoses.length > 0 ? (
        <InconclusiveDataTable
          columns={inconclusiveColumns}
          data={diagnoses.map((d) => ({
            id: d.id,
            disease: d.disease,
            confidence: d.confidence,
            uncertainty: d.uncertainty,
            symptoms: d.symptoms,
            userId: d.userId,
            chatId: d.chatId,
            district: d.district,
            barangay: d.barangay,
            createdAt: d.createdAt,
            patientId: getAnonymizedPatientId(d.userId),
            submittedAt: new Date(d.createdAt),
            notes: d.notes,
          }))}
        />
      ) : (
        <div className="card bg-base-200">
          <div className="card-body items-center text-center">
            <HelpCircle className="size-16 text-base-content/30 mb-4" />
            <h2 className="card-title">No Inconclusive Cases</h2>
            <p className="text-muted">
              There are no inconclusive diagnoses to review. All assessments have either reached 
              a confident conclusion or have been verified.
            </p>
          </div>
        </div>
      )}
    </div>
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
