"use client";

import { Diagnosis } from "@/lib/generated/prisma";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { featurePatientsColumns } from "./feature-patients-columns";
import { FeaturePatientsDataTable } from "./feature-patients-data-table";
import { FeaturePatientDetailModal } from "./feature-patient-detail-modal";

interface FeaturePatientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  diagnoses: Diagnosis[];
}

export default function FeaturePatientsModal({
  isOpen,
  onClose,
  featureName,
  diagnoses,
}: FeaturePatientsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  const handleRowClick = (row: Diagnosis) => {
    setSelectedDiagnosis(row);
    setIsDetailModalOpen(true);
  };

  const handleDetailModalClose = () => {
    setIsDetailModalOpen(false);
    setSelectedDiagnosis(null);
  };

  if (!isMounted || !isOpen) return null;

  const modalContent = (
    <>
      <dialog
        ref={dialogRef}
        className="modal [&::backdrop]:bg-black"
        onCancel={onClose}
        onClick={onClose}
      >
        <div
          className="modal-box w-11/12 max-w-7xl bg-base-100 p-0 overflow-hidden flex flex-col max-h-[90vh]"
          onClick={handleContentClick}
        >
          <div className="p-6 border-b border-border flex justify-between items-center bg-base-100">
            <div>
              <h3 className="font-bold text-lg">{featureName} Cases</h3>
              <p className="text-sm text-base-content/70">
                Showing {diagnoses.length} reported case{diagnoses.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              className="btn btn-sm btn-circle btn-ghost"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="p-6 overflow-y-auto bg-base-100 flex-1">
            {diagnoses.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-48">
                <p>No cases reported in this area for the selected period.</p>
              </div>
            ) : (
              <FeaturePatientsDataTable
                columns={featurePatientsColumns as any}
                data={diagnoses as any}
                onRowClick={handleRowClick}
              />
            )}
          </div>
        </div>
      </dialog>
      {selectedDiagnosis && (
        <FeaturePatientDetailModal
          isOpen={isDetailModalOpen}
          onClose={handleDetailModalClose}
          diagnosis={selectedDiagnosis}
        />
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}
