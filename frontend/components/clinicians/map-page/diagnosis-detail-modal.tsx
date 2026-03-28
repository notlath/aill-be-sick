"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IllnessRecord } from "@/types";
import { getReliability } from "@/utils/reliability";
import { getAnonymizedPatientId } from "@/utils/patient";
import { useTheme } from "next-themes";
import { processTokensForDisplay, type TokenWithImportance } from "@/utils/shap-tokens";
import { getExplanationByDiagnosisId } from "@/utils/explanation";
import { WordHeatmapToggle } from "@/components/shared/word-heatmap-toggle";

interface DiagnosisDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnosis: IllnessRecord | null;
}

export function DiagnosisDetailModal({
  isOpen,
  onClose,
  diagnosis,
}: DiagnosisDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
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
    if (diagnosis?.id) {
      setIsLoadingExplanation(true);
      getExplanationByDiagnosisId(diagnosis.id)
        .then((result) => {
          if (result.success) {
            setExplanation(result.success);
          }
        })
        .finally(() => setIsLoadingExplanation(false));
    }
  }, [diagnosis?.id]);

  const processedTokens = useMemo<TokenWithImportance[]>(() => {
    if (!explanation?.tokens || !explanation?.importances) return [];
    return processTokensForDisplay(explanation.tokens, explanation.importances);
  }, [explanation]);

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen || !diagnosis) return null;

  const { label, badgeClass } = getReliability(diagnosis.confidence, diagnosis.uncertainty);
  const location = [diagnosis.barangay, diagnosis.district, diagnosis.city, diagnosis.region]
    .filter(Boolean)
    .join(", ") || "Not recorded";

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
        <button
          type="button"
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
        >
          ✕
        </button>
        <h3 className="font-bold text-2xl mb-6">Case Details</h3>

        <div className="space-y-4">
          {/* Reliability badge — prominent at the top */}
          <div className="bg-base-200/50 p-4 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm text-base-content/60 mb-1">AI Assessment Reliability</p>
              <span className={`badge ${badgeClass} badge-md`}>{label}</span>
            </div>
            <div className="text-right text-xs text-base-content/40 leading-relaxed">
              <p>AI confidence: {(diagnosis.confidence * 100).toFixed(1)}%</p>
              <p>Uncertainty score: {diagnosis.uncertainty.toFixed(4)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Suggested Condition</p>
              <p className="font-medium">{diagnosis.disease}</p>
            </div>
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Patient ID</p>
              <p className="font-mono text-sm">{getAnonymizedPatientId(diagnosis.patient_id)}</p>
            </div>
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Age</p>
              <p className="font-medium">{diagnosis.patient_age ?? "—"}</p>
            </div>
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Gender</p>
              <p className="font-medium">
                {diagnosis.patient_gender
                  ? diagnosis.patient_gender.charAt(0).toUpperCase() +
                    diagnosis.patient_gender.slice(1).toLowerCase()
                  : "—"}
              </p>
            </div>
            <div className="bg-base-200/50 p-4 rounded-lg col-span-2">
              <p className="text-sm text-base-content/60 mb-1">Location</p>
              <p className="font-medium">{location}</p>
            </div>
            <div className="bg-base-200/50 p-4 rounded-lg col-span-2">
              <p className="text-sm text-base-content/60 mb-1">Assessment Date</p>
              <p className="font-medium">
                {diagnosis.diagnosed_at
                  ? new Date(diagnosis.diagnosed_at).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>

          {diagnosis.symptoms && (
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-2">Reported Symptoms</p>
              <p className="text-sm leading-relaxed">{diagnosis.symptoms}</p>
            </div>
          )}

          {/* Word Heatmap Toggle */}
          <WordHeatmapToggle
            processedTokens={processedTokens}
            isDark={isDark}
            isLoading={isLoadingExplanation}
          />
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
