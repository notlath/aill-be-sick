"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DiagnosisRow } from "./columns";
import { getAnonymizedPatientId } from "@/utils/patient";
import { getReliability } from "@/utils/reliability";
import { DiagnosisOverrideModal } from "../diagnosis-override-modal";
import { FileEdit, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { useTheme } from "next-themes";
import { processTokensForDisplay, type TokenWithImportance } from "@/utils/shap-tokens";
import { getExplanationByDiagnosisId } from "@/utils/explanation";
import { WordHeatmapToggle } from "@/components/shared/word-heatmap-toggle";
import { DiagnosisNotesSection } from "../diagnosis-notes-section";
import {
  parseReasonCodes,
  getReasonLabel,
  getReasonDescription,
} from "@/utils/anomaly-reasons";

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DiagnosisRow | null;
  onApprove?: () => void;
  onReject?: () => void;
  onSuccess?: () => void;
  onUndoRejection?: () => void;
  /** Pipe-separated reason codes from anomaly detection, e.g. "GEOGRAPHIC:RARE|TEMPORAL:RARE" */
  anomalyReason?: string | null;
}

export function ReportDetailModal({
  isOpen,
  onClose,
  report,
  onApprove,
  onReject,
  onSuccess,
  onUndoRejection,
  anomalyReason,
}: ReportDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [explanation, setExplanation] = useState<{ tokens: string[]; importances: number[] } | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (report?.id) {
      setIsLoadingExplanation(true);
      getExplanationByDiagnosisId(report.id)
        .then((result) => {
          if (result.success) {
            setExplanation(result.success);
          }
        })
        .finally(() => setIsLoadingExplanation(false));
    }
  }, [report?.id]);

  const processedTokens = useMemo<TokenWithImportance[]>(() => {
    if (!explanation?.tokens || !explanation?.importances) return [];
    return processTokensForDisplay(explanation.tokens, explanation.importances);
  }, [explanation]);

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

  const rejectionReason = report.rejectionReason || (() => {
    const note = report.notes?.find((n) => n.content.startsWith("Rejection reason: "));
    return note ? note.content.replace("Rejection reason: ", "") : null;
  })();

  const isRejected = report.status === "REJECTED";

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
            {/* Why was this case flagged — anomaly surveillance context */}
            {anomalyReason && parseReasonCodes(anomalyReason).length > 0 && (
              <div className="bg-base-200 p-4 rounded-lg space-y-3">
                <p className="text-xs text-base-content/50 uppercase tracking-wide">Why was this case flagged</p>
                {parseReasonCodes(anomalyReason).map((code, idx) => (
                  <div key={idx}>
                    <p className="text-sm font-medium">{getReasonLabel(code)}</p>
                    <p className="text-xs text-base-content/60 mt-0.5">
                      {getReasonDescription(code)}
                    </p>
                  </div>
                ))}
              </div>
            )}

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

            {/* Rejection Reason indicator if rejected */}
            {isRejected && (
              <div className="bg-error/10 border border-error/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="size-5 text-error" />
                  <p className="font-medium text-error">Diagnosis Rejected</p>
                </div>
                {rejectionReason && (
                  <div className="text-sm">
                    <p className="text-base-content/60 mb-1">Rejection Reason</p>
                    <p>{rejectionReason}</p>
                  </div>
                )}
              </div>
            )}

            {/* Reliability badge — prominent at the top */}
            <div className="bg-base-200 p-4 rounded-lg flex items-center justify-between">
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
              <div className="bg-base-200 p-4 rounded-lg">
                <p className="text-sm text-base-content/60 mb-1">
                  {hasOverride ? "AI Suggested Condition" : "Suggested Condition"}
                </p>
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
              {report.user?.age != null && (
                <div className="bg-base-200 p-4 rounded-lg">
                  <p className="text-sm text-base-content/60 mb-1">Patient Age</p>
                  <p className="font-medium">{report.user.age} years old</p>
                </div>
              )}
              {report.user?.gender && (
                <div className="bg-base-200 p-4 rounded-lg">
                  <p className="text-sm text-base-content/60 mb-1">Patient Gender</p>
                  <p className="font-medium capitalize">{report.user.gender.toLowerCase()}</p>
                </div>
              )}
            </div>

            <div className="bg-base-200 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-2">Reported Symptoms</p>
              <p className="text-sm leading-relaxed">{report.symptoms}</p>
            </div>

            {/* Word Heatmap Toggle */}
            <WordHeatmapToggle
              processedTokens={processedTokens}
              isDark={isDark}
              isLoading={isLoadingExplanation}
            />

            {/* Notes Section */}
            <DiagnosisNotesSection
              diagnosisId={report.id}
              notes={report.notes || []}
            />

            {/* Action Buttons */}
            <div className="pt-2 space-y-3">
              {/* Undo Rejection button (for rejected diagnoses) */}
              {isRejected && onUndoRejection && (
                <button
                  type="button"
                  onClick={() => {
                    onUndoRejection();
                    onClose();
                  }}
                  className="btn btn-outline btn-warning w-full gap-2"
                >
                  <RotateCcw className="size-4" />
                  Undo Rejection
                </button>
              )}

              {/* Approve/Reject buttons (for pending diagnoses) */}
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
                    Approve
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
