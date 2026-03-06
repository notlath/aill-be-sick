"use client";

import { IllnessRecord } from "@/types";
import { columns } from "./patients-columns";
import { PatientsDataTable } from "./patients-data-table";
import { useMemo } from "react";

interface PatientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: IllnessRecord[];
  clusterDisplay: string;
}

export default function PatientsModal({ isOpen, onClose, patients, clusterDisplay }: PatientsModalProps) {
  if (!isOpen) return null;

  const uniquePatients = useMemo(() => {
    const latestByPatient = new Map<number, IllnessRecord>();

    for (const record of patients) {
      const existing = latestByPatient.get(record.patient_id);

      if (!existing) {
        latestByPatient.set(record.patient_id, record);
        continue;
      }

      const existingTime = existing.diagnosed_at
        ? new Date(existing.diagnosed_at).getTime()
        : Number.NEGATIVE_INFINITY;
      const recordTime = record.diagnosed_at
        ? new Date(record.diagnosed_at).getTime()
        : Number.NEGATIVE_INFINITY;

      if (recordTime > existingTime) {
        latestByPatient.set(record.patient_id, record);
      }
    }

    return Array.from(latestByPatient.values());
  }, [patients]);

  return (
    <dialog
      className="modal modal-open bg-transparent [&::backdrop]:bg-transparent"
      onClick={onClose}
    >
      <div
        className="modal-box w-11/12 max-w-7xl bg-base-100 p-0 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border flex justify-between items-center bg-base-100">
          <div>
            <h3 className="font-bold text-lg">Cluster {clusterDisplay} Patients</h3>
            <p className="text-sm text-base-content/70">
              Showing {uniquePatients.length} unique patient{uniquePatients.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="p-6 overflow-y-auto bg-base-100 flex-1">
          <PatientsDataTable columns={columns} data={uniquePatients} />
        </div>
      </div>
    </dialog>
  );
}
