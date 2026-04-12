"use client";

import { useEffect, useState } from "react";
import { ReportDetailModal } from "@/components/clinicians/healthcare-reports-page/report-detail-modal";
import type { SurveillanceAnomaly } from "@/types";
import type { DiagnosisRow } from "@/components/clinicians/healthcare-reports-page/columns";
import { getDiagnosisById } from "@/utils/diagnosis";

interface AnomalyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  anomaly: SurveillanceAnomaly | null;
}

export function AnomalyDetailModal({
  isOpen,
  onClose,
  anomaly,
}: AnomalyDetailModalProps) {
  const [diagnosis, setDiagnosis] = useState<DiagnosisRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !anomaly) return;

    setIsLoading(true);
    setError(null);
    setDiagnosis(null);

    getDiagnosisById(anomaly.id).then((result) => {
      if (result.error) {
        setError("Failed to load diagnosis details. The record may have been removed.");
      } else if (result.success) {
        setDiagnosis(result.success as unknown as DiagnosisRow);
      } else {
        setError("Diagnosis record not found.");
      }
      setIsLoading(false);
    });
  }, [isOpen, anomaly?.id]);

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <dialog className="modal [&::backdrop]:bg-black" open>
        <div className="modal-box w-11/12 max-w-2xl bg-base-100">
          <div className="space-y-4">
            <div className="skeleton h-8 w-48" />
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-32 w-full" />
          </div>
        </div>
      </dialog>
    );
  }

  if (error) {
    return (
      <dialog className="modal [&::backdrop]:bg-black" open onClick={onClose}>
        <div className="modal-box w-11/12 max-w-2xl bg-base-100">
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
          >
            ✕
          </button>
          <h3 className="font-bold text-2xl mb-6">Report Details</h3>
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
          <div className="modal-action">
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </dialog>
    );
  }

  if (!diagnosis || !anomaly) return null;

  return (
    <ReportDetailModal
      isOpen={isOpen}
      onClose={onClose}
      report={diagnosis}
      anomalyReason={anomaly.reason}
    />
  );
}
