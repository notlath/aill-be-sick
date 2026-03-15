"use client";

import { useEffect, useRef } from "react";
import { DiagnosisRow } from "./columns";
import { getReliability } from "@/utils/reliability";

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DiagnosisRow | null;
}

export function ReportDetailModal({
  isOpen,
  onClose,
  report,
}: ReportDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen || !report) return null;

  const { label, badgeClass } = getReliability(report.confidence, report.uncertainty);
  const location = [report.barangay, report.district].filter(Boolean).join(", ") || "Not recorded";

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
        <h3 className="font-bold text-2xl mb-6">Report Details</h3>

        <div className="space-y-4">
          {/* Reliability badge — prominent at the top */}
          <div className="bg-base-200/50 p-4 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm text-base-content/60 mb-1">AI Assessment Reliability</p>
              <span className={`badge ${badgeClass} badge-md`}>{label}</span>
            </div>
            <div className="text-right text-xs text-base-content/40 leading-relaxed">
              <p>AI confidence: {(report.confidence * 100).toFixed(1)}%</p>
              <p>Uncertainty score: {report.uncertainty.toFixed(4)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Disease</p>
              <p className="font-medium">{report.disease}</p>
            </div>
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Patient</p>
              <p className="font-medium">{report.user?.name ?? "Unknown"}</p>
            </div>
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Location</p>
              <p className="font-medium">{location}</p>
            </div>
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Date Reported</p>
              <p className="font-medium">{new Date(report.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-base-200/50 p-4 rounded-lg">
            <p className="text-sm text-base-content/60 mb-2">Reported Symptoms</p>
            <p className="text-sm leading-relaxed">{report.symptoms}</p>
          </div>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
