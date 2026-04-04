"use client";

import { Clock, CheckCircle } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { patientChooseDeletionOutcome } from "@/actions/patient-choose-deletion-outcome";
import { formatGracePeriodRemaining } from "@/utils/deletion-schedule";

interface GracePeriodBannerProps {
  scheduledDeletionAt: Date;
  reason?: string | null;
  scheduledByName?: string | null;
}

export default function GracePeriodBanner({
  scheduledDeletionAt,
  reason,
  scheduledByName,
}: GracePeriodBannerProps) {
  const { execute: executeOutcome, status } = useAction(patientChooseDeletionOutcome, {
    onSuccess: ({ data }) => {
      if (data.outcome === "restored") {
        window.location.reload();
      }
    },
  });

  const handleRestore = () => {
    executeOutcome({ action: "restore" });
  };

  return (
    <div
      role="alert"
      className="alert alert-warning mx-4 mt-4 border-warning/50 bg-warning/10"
    >
      <Clock className="h-5 w-5 text-warning shrink-0" />
      <div className="flex-1">
        <h3 className="text-warning font-semibold">
          Account Scheduled for Deletion
        </h3>
        <div className="text-warning/90 space-y-2 text-sm">
          <p>
            Your account is scheduled for deletion on{" "}
            <strong>{new Date(scheduledDeletionAt).toLocaleDateString()}</strong>.{" "}
            {formatGracePeriodRemaining(scheduledDeletionAt)}.
          </p>
          {reason && (
            <p>
              Reason provided: {reason}
            </p>
          )}
          {scheduledByName && (
            <p>
              Scheduled by: {scheduledByName}
            </p>
          )}
          <p>
            If this was a mistake or you&apos;d like to keep your account, click &quot;Keep My Account&quot; below.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:ml-4 shrink-0">
        <button
          type="button"
          className="btn btn-outline btn-sm border-success text-success hover:bg-success/10"
          onClick={handleRestore}
          disabled={status === "executing"}
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Keep My Account
        </button>
      </div>
    </div>
  );
}
