"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getDiagnosisById } from "@/utils/diagnosis";
import type { DiagnosisRow } from "@/components/clinicians/healthcare-reports-page/columns";
import { ReportDetailModal } from "@/components/clinicians/healthcare-reports-page/report-detail-modal";

type PointData = {
  latitude: number | null;
  longitude: number | null;
  disease?: string;
  district?: string | null;
  barangay?: string | null;
  createdAt?: Date | string | null;
  diagnosed_at?: Date | string | null;
  [key: string]: unknown;
};

interface PointDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  point: PointData | null;
}

function isAnomalyPoint(point: PointData): boolean {
  return "anomaly_score" in point && point.anomaly_score != null;
}

function isDiagnosisPoint(point: PointData): boolean {
  return "userId" in point && typeof point.userId === "number";
}

function isIllnessRecord(point: PointData): boolean {
  return "patient_name" in point;
}

const PointDetailContent = ({
  point,
  onClose,
}: {
  point: PointData;
  onClose: () => void;
}) => {
  const [diagnosis, setDiagnosis] = useState<DiagnosisRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!point || !("id" in point)) return;
    const diagnosisId = point.id as number;
    if (!diagnosisId) return;

    setIsLoading(true);
    setError(null);
    setDiagnosis(null);

    getDiagnosisById(diagnosisId).then((result) => {
      if (result.error) {
        setError("Failed to load diagnosis details. The record may have been removed.");
      } else if (result.success) {
        setDiagnosis(result.success as unknown as DiagnosisRow);
      } else {
        setError("Diagnosis record not found.");
      }
      setIsLoading(false);
    });
  }, [point]);

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
          <h3 className="font-bold text-2xl mb-6">Case Details</h3>
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

  if (diagnosis) {
    const anomalyReason = "reason" in point ? (point.reason as string | null) : null;

    return (
      <ReportDetailModal
        isOpen={true}
        onClose={onClose}
        report={diagnosis}
        anomalyReason={anomalyReason}
      />
    );
  }

  return null;
};

export function PointDetailModal({
  isOpen,
  onClose,
  point,
}: PointDetailModalProps) {
  if (!isOpen || !point) return null;

  if (isAnomalyPoint(point) || isIllnessRecord(point) || isDiagnosisPoint(point)) {
    return createPortal(
      <PointDetailContent point={point} onClose={onClose} />,
      document.body,
    );
  }

  return null;
}

export default PointDetailModal;
