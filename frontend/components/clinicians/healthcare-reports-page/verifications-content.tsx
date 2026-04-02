import { Suspense } from "react";
import { getPendingDiagnoses, getPendingDiagnosesCount } from "@/utils/diagnosis";
import { PendingDiagnosesDataTable } from "@/components/clinicians/pending-diagnoses-page/data-table";
import { pendingDiagnosesColumns } from "@/components/clinicians/pending-diagnoses-page/columns";
import { getAnonymizedPatientId } from "@/utils/patient";
import { getReliability } from "@/utils/reliability";
import { ClipboardCheck, Clock, AlertCircle } from "lucide-react";

export default function VerificationsContent() {
  return (
    <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
      <Suspense fallback={<TableSkeleton />}>
        <PendingDiagnosesData />
      </Suspense>
    </div>
  );
}

async function PendingDiagnosesData() {
  const [{ success: diagnoses, error: diagnosesError }, { success: count, error: countError }] = 
    await Promise.all([
      getPendingDiagnoses({}),
      getPendingDiagnosesCount(),
    ]);

  if (diagnosesError) {
    throw new Error(
      typeof diagnosesError === "string" ? diagnosesError : "Failed to load pending diagnoses",
    );
  }

  if (countError) {
    throw new Error(
      typeof countError === "string" ? countError : "Failed to load pending diagnoses count",
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="alert alert-info">
        <AlertCircle className="size-5" />
        <div>
          <p className="font-medium">Verification Required</p>
          <p className="text-sm">
            Only verified diagnoses will appear in healthcare reports and surveillance dashboards.
            Patient-submitted diagnoses require clinician review to ensure accuracy.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-figure text-warning">
              <Clock className="size-8" />
            </div>
            <div className="stat-title">Pending Review</div>
            <div className="stat-value text-warning">{count ?? 0}</div>
            <div className="stat-desc">Awaiting verification</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-figure text-success">
              <ClipboardCheck className="size-8" />
            </div>
            <div className="stat-title">Verified Today</div>
            <div className="stat-value text-success">—</div>
            <div className="stat-desc">Since last session</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-figure text-error">
              <AlertCircle className="size-8" />
            </div>
            <div className="stat-title">Requires Attention</div>
            <div className="stat-value text-error">—</div>
            <div className="stat-desc">Low confidence cases</div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      {diagnoses && diagnoses.length > 0 ? (
        <PendingDiagnosesDataTable
          columns={pendingDiagnosesColumns}
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
            reliability: getReliability(d.confidence, d.uncertainty),
            submittedAt: new Date(d.createdAt),
          }))}
        />
      ) : (
        <div className="card bg-base-200">
          <div className="card-body items-center text-center">
            <ClipboardCheck className="size-16 text-success mb-4" />
            <h2 className="card-title">All Caught Up!</h2>
            <p className="text-muted">
              There are no pending diagnoses to review. All submitted diagnoses have been verified.
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
