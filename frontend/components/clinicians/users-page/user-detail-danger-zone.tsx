"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { Trash2, RotateCcw } from "lucide-react";
import { schedulePatientDeletion } from "@/actions/schedule-patient-deletion";
import { restorePatientDeletion } from "@/actions/restore-patient-deletion";

interface UserDetailDangerZoneProps {
  patientId: number;
  scheduledBy: number;
  currentUserRole: string;
  currentUserId: number;
}

export function UserDetailDangerZone({
  patientId,
  scheduledBy,
  currentUserRole,
  currentUserId,
}: UserDetailDangerZoneProps) {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [reason, setReason] = useState("");

  const { execute: scheduleDeletion, status: scheduleStatus } = useAction(schedulePatientDeletion, {
    onSuccess: () => {
      setShowScheduleModal(false);
      setReason("");
      window.location.reload();
    },
  });

  const { execute: restoreDeletion, status: restoreStatus } = useAction(restorePatientDeletion, {
    onSuccess: () => {
      window.location.reload();
    },
  });

  const handleSchedule = () => {
    if (!reason.trim()) return;
    scheduleDeletion({ patientId, reason: reason.trim() });
  };

  const handleRestore = () => {
    restoreDeletion({ patientId });
  };

  const canRestore =
    ["ADMIN", "DEVELOPER"].includes(currentUserRole) ||
    (currentUserRole === "CLINICIAN" && currentUserId === scheduledBy);

  return (
    <>
      {canRestore ? (
        <button
          type="button"
          onClick={handleRestore}
          disabled={restoreStatus === "executing"}
          className="btn btn-outline btn-sm border-success text-success hover:bg-success/10"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          {restoreStatus === "executing" ? "Restoring..." : "Restore Account"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowScheduleModal(true)}
          disabled={scheduleStatus === "executing"}
          className="btn btn-error btn-sm"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {scheduleStatus === "executing" ? "Scheduling..." : "Delete Account"}
        </button>
      )}

      {showScheduleModal && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="text-lg font-bold text-error">Schedule Patient Deletion</h3>
            <p className="py-4 text-sm text-muted-foreground">
              This will schedule the patient&apos;s account for anonymization in 30 days.
              The patient will be notified and can reclaim their account during this period.
            </p>
            <textarea
              className="textarea textarea-bordered w-full min-h-[120px]"
              placeholder="Enter reason for deletion..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowScheduleModal(false)}
                disabled={scheduleStatus === "executing"}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={handleSchedule}
                disabled={scheduleStatus === "executing" || !reason.trim()}
              >
                {scheduleStatus === "executing" ? "Scheduling..." : "Schedule Deletion"}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="submit">close</button>
          </form>
        </dialog>
      )}
    </>
  );
}
