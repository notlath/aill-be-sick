"use client";

import { Clock, LogOut, CheckCircle } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { patientChooseDeletionOutcome } from "@/actions/patient-choose-deletion-outcome";
import { formatGracePeriodRemaining } from "@/utils/deletion-schedule";
import { createClient } from "@/utils/supabase/client";

interface ScheduledDeletionModalProps {
  scheduledDeletionAt: Date;
  reason?: string | null;
  scheduledByName?: string | null;
}

export default function ScheduledDeletionModal({
  scheduledDeletionAt,
  reason,
  scheduledByName,
}: ScheduledDeletionModalProps) {
  const { execute: executeOutcome, status } = useAction(
    patientChooseDeletionOutcome,
    {
      onSuccess: ({ data }) => {
        if (data.outcome === "restored") {
          window.location.reload();
        }
      },
    },
  );

  const handleRestore = () => {
    executeOutcome({ action: "restore" });
  };

  const handleExit = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="deletion-modal-title"
        aria-describedby="deletion-modal-desc"
        className="bg-base-100 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 border border-border/50"
      >
        <div className="flex flex-col items-center text-center">
          <div className="alert alert-warning mb-4 w-full">
            <Clock className="h-6 w-6 shrink-0" />
            <div>
              <h3 id="deletion-modal-title" className="text-lg font-bold">
                Account Scheduled for Deletion
              </h3>
            </div>
          </div>

          <div
            id="deletion-modal-desc"
            className="space-y-3 text-sm text-base-content/80"
          >
            <p>
              Your account is scheduled for deletion on{" "}
              <strong>
                {new Date(scheduledDeletionAt).toLocaleDateString()}
              </strong>
              . {formatGracePeriodRemaining(scheduledDeletionAt)}.
            </p>
            {reason && <p>Reason: {reason}</p>}
            {scheduledByName && <p>Scheduled by: {scheduledByName}</p>}
            <p className="text-base-content/60">
              You cannot use the app until you decide to keep your account.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full mt-6">
            <button
              type="button"
              className="btn btn-success w-full"
              onClick={handleRestore}
              disabled={status === "executing"}
            >
              <CheckCircle className="w-4 h-4" />
              {status === "executing" ? "Processing..." : "Keep My Account"}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-ghost w-full"
              onClick={handleExit}
            >
              <LogOut className="w-4 h-4" />
              Exit to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
