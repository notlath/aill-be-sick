"use client";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, Trash2 } from "lucide-react";
import { useState } from "react";
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { execute: executeOutcome, status } = useAction(patientChooseDeletionOutcome, {
    onSuccess: (data) => {
      if (data.outcome === "restored") {
        window.location.reload();
      }
    },
  });

  const handleRestore = () => {
    executeOutcome({ action: "restore" });
  };

  const handleConfirm = () => {
    executeOutcome({ action: "confirm" });
  };

  return (
    <>
      <Alert
        variant="warning"
        className="mx-4 mt-4 border-warning/50 bg-warning/10"
      >
        <Clock className="h-5 w-5 text-warning" />
        <div className="flex-1">
          <AlertTitle className="text-warning font-semibold">
            Account Scheduled for Deletion
          </AlertTitle>
          <AlertDescription className="text-warning/90 space-y-2">
            <p>
              Your account is scheduled for deletion on{" "}
              <strong>{new Date(scheduledDeletionAt).toLocaleDateString()}</strong>.{" "}
              {formatGracePeriodRemaining(scheduledDeletionAt)}.
            </p>
            {reason && (
              <p className="text-sm">
                Reason provided: {reason}
              </p>
            )}
            {scheduledByName && (
              <p className="text-sm">
                Scheduled by: {scheduledByName}
              </p>
            )}
            <p className="text-sm">
              If this was a mistake or you&apos;d like to keep your account, click &quot;Keep My Account&quot; below.
            </p>
          </AlertDescription>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestore}
            disabled={status === "executing"}
            className="border-success text-success hover:bg-success/10"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Keep My Account
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfirmModal(true)}
            disabled={status === "executing"}
            className="border-error text-error hover:bg-error/10"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Continue with Deletion
          </Button>
        </div>
      </Alert>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="modal-box max-w-md">
            <h3 className="text-lg font-bold text-error">Confirm Account Deletion</h3>
            <p className="py-4">
              Are you sure you want to proceed with deleting your account? This action
              cannot be undone. Your personal information will be permanently removed.
            </p>
            <div className="modal-action">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                disabled={status === "executing"}
              >
                Cancel
              </Button>
              <Button
                variant="error"
                onClick={handleConfirm}
                disabled={status === "executing"}
              >
                {status === "executing" ? "Processing..." : "Yes, Delete My Account"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
