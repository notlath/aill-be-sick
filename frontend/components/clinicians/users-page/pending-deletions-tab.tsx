import prisma from "@/prisma/prisma";
import { getCurrentDbUser } from "@/utils/user";
import { canRestoreDeletion, formatGracePeriodRemaining } from "@/utils/deletion-schedule";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Clock, Eye } from "lucide-react";
import { Suspense } from "react";
import { RestoreButton } from "./restore-deletion-button";

function PendingDeletionsSkeleton() {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="h-12 border-b border-border bg-base-200/50 px-6 py-3">
        <div className="skeleton h-5 w-48" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
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
  );
}

async function PendingDeletionsTable() {
  const { success: dbUser } = await getCurrentDbUser();
  const currentUserRole = dbUser?.role || "";
  const currentUserId = dbUser?.id || 0;

  const schedules = await prisma.deletionSchedule.findMany({
    where: { status: "SCHEDULED" },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      scheduledByUser: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { scheduledDeletionAt: "asc" },
  });

  if (schedules.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg">No pending deletions</p>
        <p className="text-sm">Patients scheduled for deletion will appear here.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="h-12 border-b border-border bg-base-200/50 px-6 py-3 grid grid-cols-5 gap-4 text-sm font-medium text-muted">
        <span>Patient</span>
        <span>Scheduled By</span>
        <span>Scheduled Date</span>
        <span>Time Remaining</span>
        <span>Actions</span>
      </div>
      {schedules.map((schedule) => {
        const canRestore = canRestoreDeletion(currentUserRole, currentUserId, schedule.scheduledBy);

        return (
          <div
            key={schedule.id}
            className="h-auto min-h-[4rem] border-b border-border/50 px-6 py-4 grid grid-cols-5 gap-4 items-center"
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{schedule.user.name || "—"}</span>
              <span className="text-xs text-muted">{schedule.user.email}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm">{schedule.scheduledByUser.name || "—"}</span>
              <span className="text-xs text-muted">{schedule.scheduledByUser.email}</span>
            </div>
            <span className="text-sm">
              {new Date(schedule.scheduledDeletionAt).toLocaleDateString()}
            </span>
            <span>
              <Badge variant="default" className="bg-warning text-warning-content">
                {formatGracePeriodRemaining(schedule.scheduledDeletionAt)}
              </Badge>
            </span>
            <div className="flex items-center gap-2">
              <Link href={`/users/${schedule.user.id}`} className="btn btn-ghost btn-sm">
                <Eye className="w-4 h-4" />
              </Link>
              {canRestore && (
                <RestoreButton patientId={schedule.user.id} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PendingDeletionsTab() {
  return (
    <Suspense fallback={<PendingDeletionsSkeleton />}>
      <PendingDeletionsTable />
    </Suspense>
  );
}
