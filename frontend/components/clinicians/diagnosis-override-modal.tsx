"use client";

import { useEffect, useRef, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { overrideDiagnosis } from "@/actions/override-diagnosis";
import { getReliability } from "@/utils/reliability";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, FileEdit, Loader2 } from "lucide-react";

interface DiagnosisData {
  id: number;
  disease: string;
  confidence: number;
  uncertainty: number;
  symptoms: string;
}

interface DiagnosisOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnosis: DiagnosisData | null;
}

const DISEASES = [
  { value: "DENGUE", label: "Dengue" },
  { value: "PNEUMONIA", label: "Pneumonia" },
  { value: "TYPHOID", label: "Typhoid" },
  { value: "DIARRHEA", label: "Diarrhea" },
  { value: "MEASLES", label: "Measles" },
  { value: "INFLUENZA", label: "Influenza" },
] as const;

export function DiagnosisOverrideModal({
  isOpen,
  onClose,
  diagnosis,
}: DiagnosisOverrideModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedDisease, setSelectedDisease] = useState<string>("");
  const [clinicianNotes, setClinicianNotes] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);

  const { execute, status, result } = useAction(overrideDiagnosis, {
    onSuccess: () => {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
        // Reset form
        setSelectedDisease("");
        setClinicianNotes("");
      }, 2000);
    },
  });

  const isExecuting = status === "executing";

  // Initialize selected disease when diagnosis changes
  useEffect(() => {
    if (diagnosis) {
      // Map the diagnosis disease to the enum format
      const diseaseKey = diagnosis.disease.toUpperCase().replace(/\s+/g, "_");
      setSelectedDisease(diseaseKey);
    }
  }, [diagnosis]);

  // Handle dialog open/close
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis || !selectedDisease) return;

    execute({
      diagnosisId: diagnosis.id,
      clinicianDisease: selectedDisease as any,
      clinicianNotes: clinicianNotes.trim() || undefined,
    });
  };

  const handleClose = () => {
    if (!isExecuting) {
      onClose();
      setSelectedDisease("");
      setClinicianNotes("");
    }
  };

  if (!isOpen || !diagnosis) return null;

  const { label: reliabilityLabel, badgeClass } = getReliability(
    diagnosis.confidence,
    diagnosis.uncertainty
  );

  // Check if clinician is changing the disease
  const originalDiseaseKey = diagnosis.disease.toUpperCase().replace(/\s+/g, "_");
  const isChangingDisease = selectedDisease !== originalDiseaseKey;

  return (
    <dialog
      ref={dialogRef}
      className="modal [&::backdrop]:bg-black"
      onCancel={handleClose}
      onClick={handleClose}
    >
      <div
        className="modal-box w-11/12 max-w-2xl bg-base-100 max-h-[90vh] overflow-y-auto"
        onClick={handleContentClick}
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={isExecuting}
          className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <FileEdit className="size-6 text-primary" strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-bold text-xl">Clinical Override</h3>
            <p className="text-sm text-base-content/60">
              Review and update the AI assessment with your clinical judgment
            </p>
          </div>
        </div>

        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="p-4 rounded-full bg-success/10 mb-4">
              <CheckCircle2 className="size-12 text-success" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-medium text-success">Override Saved</p>
            <p className="text-sm text-base-content/60 mt-1">
              Your clinical assessment has been recorded and the diagnosis has been verified
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Auto-verification Info Alert */}
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p className="text-sm font-medium">Automatic Verification</p>
                <p className="text-xs">
                  Adding a clinical override will automatically verify this diagnosis and remove it from the pending queue.
                </p>
              </div>
            </div>

            {/* Original AI Assessment Section */}
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm font-medium text-base-content/70 mb-3">
                Original AI Assessment
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-base-content/50 mb-1">
                    Suggested Condition
                  </p>
                  <p className="font-medium">{diagnosis.disease}</p>
                </div>
                <div>
                  <p className="text-xs text-base-content/50 mb-1">Reliability</p>
                  <span className={`badge ${badgeClass} badge-sm`}>
                    {reliabilityLabel}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-base-content/50 mb-1">Confidence</p>
                  <p className="font-mono text-sm">
                    {(diagnosis.confidence * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-base-content/50 mb-1">Uncertainty</p>
                  <p className="font-mono text-sm">
                    {diagnosis.uncertainty.toFixed(4)}
                  </p>
                </div>
              </div>
              {diagnosis.symptoms && (
                <div className="mt-3 pt-3 border-t border-base-300/50">
                  <p className="text-xs text-base-content/50 mb-1">
                    Reported Symptoms
                  </p>
                  <p className="text-sm leading-relaxed">{diagnosis.symptoms}</p>
                </div>
              )}
            </div>

            {/* Clinician Override Section */}
            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text font-medium">
                    Your Clinical Assessment
                  </span>
                </label>
                <Select
                  value={selectedDisease}
                  onValueChange={setSelectedDisease}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISEASES.map((disease) => (
                      <SelectItem key={disease.value} value={disease.value}>
                        {disease.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="label">
                  <span className="label-text font-medium">
                    Clinical Notes{" "}
                    <span className="font-normal text-base-content/50">
                      (optional)
                    </span>
                  </span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full h-24 resize-none"
                  placeholder="Document your clinical reasoning for this assessment..."
                  value={clinicianNotes}
                  onChange={(e) => setClinicianNotes(e.target.value)}
                  maxLength={1000}
                  disabled={isExecuting}
                />
                <p className="text-xs text-base-content/50 mt-1 text-right">
                  {clinicianNotes.length}/1000
                </p>
              </div>

              {isChangingDisease && (
                <div className="alert alert-warning">
                  <AlertTriangle className="size-5" />
                  <span className="text-sm">
                    You are changing the assessment from{" "}
                    <strong>{diagnosis.disease}</strong> to a different condition.
                    This will be logged for audit purposes.
                  </span>
                </div>
              )}

              {result?.serverError && (
                <div className="alert alert-error">
                  <AlertTriangle className="size-5" />
                  <span className="text-sm">{result.serverError}</span>
                </div>
              )}

              {result?.data?.error && (
                <div className="alert alert-error">
                  <AlertTriangle className="size-5" />
                  <span className="text-sm">{result.data.error}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                className="btn btn-ghost flex-1"
                onClick={handleClose}
                disabled={isExecuting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={isExecuting || !selectedDisease}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Override"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button disabled={isExecuting}>close</button>
      </form>
    </dialog>
  );
}
