"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { Button } from "@/components/ui/button";
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
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestore}
          disabled={restoreStatus === "executing"}
          className="border-success text-success hover:bg-success/10"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          {restoreStatus === "executing" ? "Restoring..." : "Restore Account"}
        </Button>
      ) : (
        <Button
          variant="error"
          size="sm"
          onClick={() => setShowScheduleModal(true)}
          disabled={scheduleStatus === "executing"}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {scheduleStatus === "executing" ? "Scheduling..." : "Delete Account"}
        </Button>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="modal-box max-w-md">
            <h3 className="text-lg font-bold text-error">Schedule Patient Deletion</h3>
            <p className="py-4 text-sm text-muted">
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
              <Button
                variant="outline"
                onClick={() => setShowScheduleModal(false)}
                disabled={scheduleStatus === "executing"}
              >
                Cancel
              </Button>
              <Button
                variant="error"
                onClick={handleSchedule}
                disabled={scheduleStatus === "executing" || !reason.trim()}
              >
                {scheduleStatus === "executing" ? "Scheduling..." : "Schedule Deletion"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
