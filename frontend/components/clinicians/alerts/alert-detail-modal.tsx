"use client";

import { useEffect, useRef } from "react";
import type { Alert } from "@/types";
import { getReasonLabel, getReasonDescription } from "@/utils/anomaly-reasons";
import { getSeverityBadgeClass, getSeverityLabel } from "@/utils/alert-severity";

const typeLabel: Record<Alert["type"], string> = {
  ANOMALY: "Anomaly",
  LOW_CONFIDENCE: "Low Confidence",
  HIGH_UNCERTAINTY: "High Uncertainty",
};

const statusLabel: Record<Alert["status"], string> = {
  NEW: "New",
  READ: "Read",
  ACKNOWLEDGED: "Acknowledged",
  DISMISSED: "Dismissed",
};

const statusBadgeClass: Record<Alert["status"], string> = {
  NEW: "badge-error",
  READ: "badge-warning",
  ACKNOWLEDGED: "badge-success",
  DISMISSED: "badge-ghost",
};

interface AlertDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: Alert | null;
  onAcknowledge: (id: number) => Promise<void>;
  onDismiss: (id: number) => Promise<void>;
}

export function AlertDetailModal({
  isOpen,
  onClose,
  alert,
  onAcknowledge,
  onDismiss,
}: AlertDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Prevent closing when clicking inside the modal content
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleClose = async () => {
    onClose();
  };

  const handleAcknowledge = async () => {
    if (!alert) return;
    await onAcknowledge(alert.id);
    handleClose();
  };

  const handleDismiss = async () => {
    if (!alert) return;
    await onDismiss(alert.id);
    handleClose();
  };

  if (!isOpen || !alert) return null;

  return (
    <dialog
      ref={dialogRef}
      className="modal [&::backdrop]:bg-black"
      onCancel={onClose}
      onClick={onClose}
    >
      <div
        className="modal-box w-11/12 max-w-2xl bg-base-100 max-h-[90vh] overflow-y-auto"
        onClick={handleContentClick}
      >
        <form method="dialog">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4">
            ✕
          </button>
        </form>
        <h3 className="font-bold text-2xl mb-6">Alert Details</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Type</p>
              <p className="font-medium">{typeLabel[alert.type]}</p>
            </div>
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Severity</p>
              <span
                className={`badge ${getSeverityBadgeClass(alert.severity)}`}
              >
                {getSeverityLabel(alert.severity)}
              </span>
            </div>
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Status</p>
              <span
                className={`badge ${statusBadgeClass[alert.status]}`}
              >
                {statusLabel[alert.status]}
              </span>
            </div>
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Diagnosis ID</p>
              <p className="font-medium">{alert.diagnosisId ?? "—"}</p>
            </div>
          </div>

          <div className="bg-base-200/50 p-4 rounded-lg">
            <p className="text-sm text-base-content/60 mb-1">Message</p>
            <p className="text-sm leading-relaxed">{alert.message}</p>
          </div>

          {alert.reasonCodes.length > 0 && (
            <div className="bg-base-200/50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-base-content/60 mb-2">Reason Codes</p>
              {alert.reasonCodes.map((code) => (
                <div key={code}>
                  <p className="text-sm font-medium">{getReasonLabel(code)}</p>
                  <p className="text-xs text-base-content/60 mt-0.5">
                    {getReasonDescription(code)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {alert.metadata && (
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-2">Additional Info</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {(alert.metadata as any).disease && (
                  <>
                    <span className="text-base-content/60">Disease</span>
                    <span className="font-medium">{(alert.metadata as any).disease}</span>
                  </>
                )}
                {(alert.metadata as any).city && (
                  <>
                    <span className="text-base-content/60">City</span>
                    <span className="font-medium">{(alert.metadata as any).city}</span>
                  </>
                )}
                {(alert.metadata as any).district && (
                  <>
                    <span className="text-base-content/60">District</span>
                    <span className="font-medium">{(alert.metadata as any).district}</span>
                  </>
                )}
                {(alert.metadata as any).province && (
                  <>
                    <span className="text-base-content/60">Province</span>
                    <span className="font-medium">{(alert.metadata as any).province}</span>
                  </>
                )}
                {(alert.metadata as any).anomalyScore !== undefined && (
                  <>
                    <span className="text-base-content/60">Anomaly Score</span>
                    <span className="font-medium">
                      {Number((alert.metadata as any).anomalyScore).toFixed(4)}
                    </span>
                  </>
                )}
                {(alert.metadata as any).confidence !== undefined && (
                  <>
                    <span className="text-base-content/60">Confidence</span>
                    <span className="font-medium">
                      {(Number((alert.metadata as any).confidence) * 100).toFixed(2)}%
                    </span>
                  </>
                )}
                {(alert.metadata as any).patientAge !== undefined && (
                  <>
                    <span className="text-base-content/60">Patient Age</span>
                    <span className="font-medium">{(alert.metadata as any).patientAge}</span>
                  </>
                )}
                {(alert.metadata as any).patientGender && (
                  <>
                    <span className="text-base-content/60">Patient Gender</span>
                    <span className="font-medium capitalize">
                      {String((alert.metadata as any).patientGender).toLowerCase()}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="bg-base-200/50 p-4 rounded-lg flex justify-between items-center">
            <div>
              <p className="text-sm text-base-content/60 mb-1">Date Created</p>
              <p className="font-medium">
                {new Date(alert.createdAt).toLocaleString()}
              </p>
            </div>
            {alert.acknowledgedAt && (
              <div className="text-right">
                <p className="text-sm text-base-content/60 mb-1">Acknowledged At</p>
                <p className="font-medium">
                  {new Date(alert.acknowledgedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {(alert.status === "NEW" || alert.status === "READ") && (
            <div className="flex gap-2 justify-end pt-2">
              <button
                className="btn btn-success btn-sm"
                onClick={handleAcknowledge}
              >
                Acknowledge
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleDismiss}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
