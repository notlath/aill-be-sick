import { Suspense } from "react";
import { connection } from "next/server";
import { getRejectedDiagnoses, getRejectedDiagnosesCount } from "@/utils/diagnosis";
import { RejectedDataTable } from "./rejected-data-table";
import { rejectedColumns } from "./rejected-columns";
import { getAnonymizedPatientId } from "@/utils/patient";
import { XCircle, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function RejectedContent() {
  return (
    <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
      <Suspense fallback={<TableSkeleton />}>
        <RejectedDiagnosesData />
      </Suspense>
    </div>
  );
}

async function RejectedDiagnosesData() {
  await connection();

  const [
    { success: diagnoses, error: diagnosesError },
    { success: count, error: countError },
  ] = await Promise.all([
    getRejectedDiagnoses({}),
    getRejectedDiagnosesCount(),
  ]);

  if (diagnosesError) {
    throw new Error(
      typeof diagnosesError === "string" ? diagnosesError : "Failed to load rejected diagnoses",
    );
  }

  if (countError) {
    console.error("Failed to load rejected count:", countError);
  }

  return (
    <div className="space-y-4">
      <div className="alert alert-error">
        <XCircle className="size-5" />
        <div>
          <p className="font-medium">Rejected Diagnoses</p>
          <p className="text-sm">
            These diagnoses were rejected by clinicians and are excluded from healthcare reports
            and surveillance dashboards. You can undo a rejection to return it to the review queue.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
            <CardTitle className="text-sm font-medium text-base-content/60">
              Rejected Cases
            </CardTitle>
            <XCircle className="h-4 w-4 text-error" />
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="text-2xl font-bold">{count ?? 0}</div>
            <p className="text-xs text-base-content/60 mt-1">
              Excluded from reports
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
              Review rejected cases and undo if the rejection was made in error.
              Reverted diagnoses return to the pending review queue.
            </p>
          </CardContent>
        </Card>
      </div>

      {diagnoses && diagnoses.length > 0 ? (
        <RejectedDataTable
          columns={rejectedColumns}
          data={diagnoses.map((d) => {
            const rejectionNote = (d as any).notes?.find(
              (n: any) => n.content.startsWith("Rejection reason: ")
            );
            return {
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
              user: (d as any).user,
              notes: (d as any).notes,
              rejectedByUser: (d as any).rejectedByUser,
              rejectedAt: (d as any).rejectedAt,
              clinicalVerification: d.clinicalVerification as any,
              clinicalVerificationStatus:
                d.clinicalVerificationStatus as any,
              rejectionReason: rejectionNote
                ? rejectionNote.content.replace("Rejection reason: ", "")
                : undefined,
            };
          })}
        />
      ) : (
        <div className="card bg-base-200">
          <div className="card-body items-center text-center">
            <XCircle className="size-16 text-base-content/30 mb-4" />
            <h2 className="card-title">No Rejected Diagnoses</h2>
            <p className="text-muted">
              There are no rejected diagnoses to review. All submitted diagnoses are either pending, verified, or inconclusive.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex w-full">
          <div className="skeleton h-10 flex-1 min-w-48 rounded-lg" />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="skeleton h-10 w-48 rounded-lg" />
          <div className="skeleton h-10 w-44 rounded-lg" />
          <div className="skeleton h-10 w-[150px] rounded-lg" />
          <div className="skeleton h-10 w-[150px] rounded-lg" />
          <div className="skeleton h-10 w-32 rounded-lg ml-auto" />
        </div>
      </div>
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
