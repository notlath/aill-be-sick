"use client";

import { useEffect, useRef } from "react";
import { User } from "@/lib/generated/prisma";

interface PatientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: User | null;
}

export function PatientDetailModal({
  isOpen,
  onClose,
  patient,
}: PatientDetailModalProps) {
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

  if (!isOpen || !patient) return null;

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
        <h3 className="font-bold text-2xl mb-6">Patient Details</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Name</p>
              <p className="font-medium">{patient.name || "N/A"}</p>
            </div>
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Email</p>
              <p className="font-medium">{patient.email || "N/A"}</p>
            </div>
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Age</p>
              <p className="font-medium">{patient.age || "N/A"}</p>
            </div>
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Gender</p>
              <p className="font-medium">
                {patient.gender
                  ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).toLowerCase()
                  : "N/A"}
              </p>
            </div>
            <div className="bg-base-200/50 p-4 rounded-lg col-span-2">
              <p className="text-sm text-base-content/60 mb-1">Location</p>
              <p className="font-medium">
                {patient.city || patient.province
                  ? [patient.city, patient.province].filter(Boolean).join(", ")
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
