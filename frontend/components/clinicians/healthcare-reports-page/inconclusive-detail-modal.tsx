"use client";

import { useEffect, useRef, useState } from "react";
import { InconclusiveDiagnosisRow } from "./inconclusive-columns";
import { getAnonymizedPatientId } from "@/utils/patient";
import { DiagnosisOverrideModal } from "../diagnosis-override-modal";
import { FileEdit, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { DiagnosisNotesSection } from "../diagnosis-notes-section";

interface InconclusiveDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: InconclusiveDiagnosisRow | null;
  onApprove?: () => void;
  onReject?: () => void;
  onSuccess?: () => void;
}

export function InconclusiveDetailModal({
  isOpen,
  onClose,
  report,
  onApprove,
  onReject,
  onSuccess,
}: InconclusiveDetailModalProps) {
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

  const handleOpenOverride = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();

    setIsOverrideModalOpen(true);
  };

  const handleCloseOverride = () => {
    setIsOverrideModalOpen(false);
    // Call onSuccess if provided (useful for refreshing parent state)
    if (onSuccess) {
      onSuccess();
    }
  };

  if (!isOpen || !report) return null;

  const location = [report.barangay, report.district].filter(Boolean).join(", ") || "Not recorded";

  // Prepare diagnosis data for the override modal
  const diagnosisForOverride = {
    id: report.id,
    disease: report.disease,
    confidence: report.confidence,
    uncertainty: report.uncertainty,
    symptoms: report.symptoms,
  };

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
          <h3 className="font-bold text-2xl mb-6">Inconclusive Assessment Details</h3>

          <div className="space-y-4">
            {/* Inconclusive Status Banner */}
            <div className="bg-warning/10 border border-warning/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="size-5 text-warning" />
                <p className="font-medium text-warning">Inconclusive AI Assessment</p>
              </div>
              <p className="text-sm text-base-content/70">
                The AI model was unable to determine a likely condition based on the symptoms provided. 
                Review the patient&apos;s symptoms and either verify the suggested condition or override with your clinical assessment.
              </p>
            </div>

            {/* Model Stats — note low confidence/high uncertainty */}
            <div className="bg-base-200 p-4 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm text-base-content/60 mb-1">AI Assessment Reliability</p>
                <span className="badge badge-soft badge-md">Inconclusive</span>
              </div>
              <div className="text-right text-xs text-base-content/40 leading-relaxed">
                <p>AI confidence: {(report.confidence * 100).toFixed(1)}%</p>
                <p>Uncertainty score: {report.uncertainty.toFixed(4)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-base-200 p-4 rounded-lg">
                <p className="text-sm text-base-content/60 mb-1">Suggested Condition</p>
                <p className="font-medium">{report.disease}</p>
              </div>
              <div className="bg-base-200 p-4 rounded-lg">
                <p className="text-sm text-base-content/60 mb-1">Patient ID</p>
                <p className="font-mono text-sm">{getAnonymizedPatientId(report.userId)}</p>
              </div>
              <div className="bg-base-200 p-4 rounded-lg">
                <p className="text-sm text-base-content/60 mb-1">Location</p>
                <p className="font-medium">{location}</p>
              </div>
              <div className="bg-base-200 p-4 rounded-lg">
                <p className="text-sm text-base-content/60 mb-1">Date Reported</p>
                <p className="font-medium">{new Date(report.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-base-200 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-2">Reported Symptoms</p>
              <p className="text-sm leading-relaxed">{report.symptoms}</p>
            </div>

            {/* No SHAP explanation for inconclusive diagnoses */}
            <div className="bg-base-200/50 border border-dashed border-base-300 p-4 rounded-lg">
              <p className="text-sm text-base-content/50 text-center">
                SHAP explanation not available for inconclusive assessments.
              </p>
            </div>

            {/* Notes Section */}
            <DiagnosisNotesSection
              diagnosisId={report.id}
              notes={report.notes || []}
            />

            {/* Action Buttons */}
            <div className="pt-2 space-y-3">
              {/* Verify/Reject buttons */}
              {onApprove && onReject && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onApprove();
                      onClose();
                    }}
                    className="btn btn-success flex-1 gap-2"
                  >
                    <CheckCircle2 className="size-4" />
                    Verify
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onReject();
                      onClose();
                    }}
                    className="btn btn-outline btn-error flex-1 gap-2"
                  >
                    <XCircle className="size-4" />
                    Reject
                  </button>
                </div>
              )}

              {/* Clinical Override Button */}
              <button
                type="button"
                onClick={handleOpenOverride}
                className="btn btn-outline btn-primary w-full gap-2"
              >
                <FileEdit className="size-4" />
                Override with Clinical Assessment
              </button>
              <p className="text-xs text-base-content/50 text-center mt-2">
                Use your clinical judgment to provide an accurate diagnosis
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
