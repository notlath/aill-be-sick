"use client";

import { useEffect, useRef, useState } from "react";
import { DiagnosisRow, getAnonymizedPatientId } from "./columns";
import { getReliability } from "@/utils/reliability";
import { DiagnosisOverrideModal } from "../diagnosis-override-modal";
import { FileEdit, CheckCircle2 } from "lucide-react";

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
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

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

  const handleOpenOverride = () => {
    setIsOverrideModalOpen(true);
  };

  const handleCloseOverride = () => {
    setIsOverrideModalOpen(false);
  };

  if (!isOpen || !report) return null;

  const { label, badgeClass } = getReliability(report.confidence, report.uncertainty);
  const location = [report.barangay, report.district].filter(Boolean).join(", ") || "Not recorded";

  // Prepare diagnosis data for the override modal
  const diagnosisForOverride = {
    id: report.id,
    disease: report.disease,
    confidence: report.confidence,
    uncertainty: report.uncertainty,
    symptoms: report.symptoms,
  };

  // Check if this diagnosis has been overridden
  const hasOverride = report.override !== undefined && report.override !== null;

  return (
    <>
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
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
          >
            ✕
          </button>
          <h3 className="font-bold text-2xl mb-6">Report Details</h3>

          <div className="space-y-4">
            {/* Clinician Override indicator if present */}
            {hasOverride && report.override && (
              <div className="bg-success/10 border border-success/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="size-5 text-success" />
                  <p className="font-medium text-success">Clinical Override Applied</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-base-content/60">Clinician Assessment</p>
                    <p className="font-medium">{report.override.clinicianDisease}</p>
                  </div>
                  <div>
                    <p className="text-base-content/60">Override Date</p>
                    <p className="font-medium">
                      {new Date(report.override.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {report.override.clinicianNotes && (
                    <div className="col-span-2">
                      <p className="text-base-content/60">Clinical Notes</p>
                      <p className="mt-1">{report.override.clinicianNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                <p className="text-sm text-base-content/60 mb-1">
                  {hasOverride ? "AI Suggested Condition" : "Suggested Condition"}
                </p>
                <p className="font-medium">{report.disease}</p>
              </div>
              <div className="bg-base-200/50 p-4 rounded-lg">
                <p className="text-sm text-base-content/60 mb-1">Patient ID</p>
                <p className="font-mono text-sm">{getAnonymizedPatientId(report.userId)}</p>
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

            {/* Clinical Override Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenOverride}
                className="btn btn-outline btn-primary w-full gap-2"
              >
                <FileEdit className="size-4" />
                {hasOverride ? "Update Clinical Override" : "Add Clinical Override"}
              </button>
              <p className="text-xs text-base-content/50 text-center mt-2">
                Use your clinical judgment to adjust or confirm the AI assessment
              </p>
            </div>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Override Modal */}
      <DiagnosisOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={handleCloseOverride}
        diagnosis={diagnosisForOverride}
      />
    </>
  );
}
