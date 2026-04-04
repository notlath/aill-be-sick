"use client";

import { useState, useEffect } from "react";
import { useAction } from "next-safe-action/hooks";
import { Trash2, RotateCcw, AlertTriangle, Eye, Database } from "lucide-react";
import { schedulePatientDeletion } from "@/actions/schedule-patient-deletion";
import { restorePatientDeletion } from "@/actions/restore-patient-deletion";
import { createPortal } from "react-dom";
import { getDeletionImpactSummary } from "@/utils/deletion-impact";

interface UserDetailDangerZoneProps {
  patientId: number;
  scheduledBy: number;
  currentUserRole: string;
  currentUserId: number;
  isScheduled: boolean;
}

export function UserDetailDangerZone({
  patientId,
  scheduledBy,
  currentUserRole,
  currentUserId,
  isScheduled,
}: UserDetailDangerZoneProps) {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [reason, setReason] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { execute: scheduleDeletion, status: scheduleStatus } = useAction(
    schedulePatientDeletion,
    {
      onSuccess: () => {
        setShowScheduleModal(false);
        setReason("");
        window.location.reload();
      },
    },
  );

  const { execute: restoreDeletion, status: restoreStatus } = useAction(
    restorePatientDeletion,
    {
      onSuccess: () => {
        window.location.reload();
      },
    },
  );

  const handleSchedule = () => {
    if (!reason.trim()) return;
    scheduleDeletion({ patientId, reason: reason.trim() });
  };

  const handleRestore = () => {
    restoreDeletion({ patientId });
  };

  const canRestore = isScheduled;
  const impact = getDeletionImpactSummary();

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

      {showScheduleModal &&
        mounted &&
        createPortal(
          <dialog className="modal modal-open">
            <div className="modal-box max-w-lg overflow-y-auto max-h-[90vh]">
              <h3 className="text-lg font-bold text-error">
                Schedule Patient Deletion
              </h3>
              <p className="py-3 text-sm text-base-content/80">
                This starts a 30-day grace period. The patient can choose to
                keep their account any time before it ends.
              </p>

              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-base-content mb-2 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-info" />
                    Information that will be made anonymous
                  </h4>
                  <ul className="space-y-1.5 text-base-content/80 ml-6 list-disc">
                    {impact.anonymized.map((item) => (
                      <li key={item.label}>
                        <span className="font-medium">{item.label}</span>
                        {" — "}
                        {item.detail}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-base-content mb-2 flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-error" />
                    Information that will be permanently removed
                  </h4>
                  <ul className="space-y-1.5 text-base-content/80 ml-6 list-disc">
                    {impact.deleted.map((item) => (
                      <li key={item.label}>
                        <span className="font-medium">{item.label}</span>
                        {" — "}
                        {item.detail}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-base-content mb-2 flex items-center gap-2">
                    <Database className="w-4 h-4 text-success" />
                    Information that will be kept (anonymous)
                  </h4>
                  <ul className="space-y-1.5 text-base-content/80 ml-6 list-disc">
                    {impact.kept.map((item) => (
                      <li key={item.label}>
                        <span className="font-medium">{item.label}</span>
                        {" — "}
                        {item.detail}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="alert alert-warning border-warning/50 bg-warning/10 py-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <p className="text-xs">
                    After the grace period ends, this cannot be undone. The
                    account cannot be recovered.
                  </p>
                </div>
              </div>

              <label className="label mt-4">
                <span className="label-text font-medium">
                  Reason for deletion
                </span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full min-h-[100px]"
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
                  {scheduleStatus === "executing"
                    ? "Scheduling..."
                    : "Schedule Deletion"}
                </button>
              </div>
            </div>
            <form method="dialog" className="modal-backdrop">
              <button type="submit">close</button>
            </form>
          </dialog>,
          document.body,
        )}
    </>
  );
}
