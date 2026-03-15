"use client";

import { IllnessRecord } from "@/types";
import { columns } from "./patients-columns";
import { PatientsDataTable } from "./patients-data-table";
import { useEffect, useRef } from "react";

interface PatientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: IllnessRecord[];
  clusterDisplay: string;
  title?: string;
  subtitle?: string;
}

export default function PatientsModal({
  isOpen,
  onClose,
  patients,
  clusterDisplay,
  title,
  subtitle,
}: PatientsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  // Use the raw patients prop as each record corresponds to a diagnosis

  if (!isOpen) return null;

  return (
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
            <h3 className="font-bold text-lg">
              {title ?? `Group ${clusterDisplay} Patients`}
            </h3>
            <p className="text-sm text-base-content/70">
              {subtitle ??
                `Showing ${patients.length} patient record${
                  patients.length !== 1 ? "s" : ""
                }`}
            </p>
          </div>
          <button type="button" className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto bg-base-100 flex-1">
          <PatientsDataTable columns={columns} data={patients} />
        </div>
      </div>
    </dialog>
  );
}
