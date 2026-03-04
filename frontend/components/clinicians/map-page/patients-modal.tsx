"use client";

import { IllnessRecord } from "@/types";
import { columns } from "./patients-columns";
import { PatientsDataTable } from "./patients-data-table";

interface PatientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: IllnessRecord[];
  clusterDisplay: string;
}

export default function PatientsModal({ isOpen, onClose, patients, clusterDisplay }: PatientsModalProps) {
  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open bg-black/50" onClick={onClose}>
      <div
        className="modal-box w-11/12 max-w-7xl bg-base-100 p-0 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border flex justify-between items-center bg-base-100">
          <div>
            <h3 className="font-bold text-lg">Cluster {clusterDisplay} Patients</h3>
            <p className="text-sm text-base-content/70">
              Showing {patients.length} patient{patients.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="p-6 overflow-y-auto bg-base-100 flex-1">
          <PatientsDataTable columns={columns} data={patients} />
        </div>
      </div>
    </dialog>
  );
}
