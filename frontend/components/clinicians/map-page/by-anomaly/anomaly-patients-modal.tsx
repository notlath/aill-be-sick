"use client";

import { useEffect, useRef } from "react";
         
import type { SurveillanceAnomaly } from "@/types";


import { AnomalyDataTable } from "./anomaly-data-table";

// ─── Modal ────────────────────────────────────────────────────────────────────

interface AnomalyPatientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  anomalies: SurveillanceAnomaly[];
  isAnomaly?: boolean;
}

const AnomalyPatientsModal = ({
  isOpen,
  onClose,
  title,
  anomalies,
  isAnomaly = true,
}: AnomalyPatientsModalProps) => {
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

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="modal [&::backdrop]:bg-black"
      onCancel={onClose}
      onClick={onClose}
    >
      <div
        className="modal-box w-11/12 max-w-[1500px] bg-base-100 p-0 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={handleContentClick}
      >
        <div className="p-6 border-b border-border flex justify-between items-center bg-base-100">
          <div>
            <h3 className="font-bold text-lg">{title}</h3>
            <p className="text-sm text-base-content/70">
              Showing {anomalies.length} record
              {anomalies.length !== 1 ? "s" : ""}
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
          {anomalies.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-48">
              <p>No records found for the selected filters.</p>
            </div>
          ) : (
            <AnomalyDataTable data={anomalies} isAnomaly={isAnomaly} />
          )}
        </div>
      </div>
    </dialog>
  );
};

export default AnomalyPatientsModal;
