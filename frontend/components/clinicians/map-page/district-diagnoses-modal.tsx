"use client";

import { Diagnosis } from "@/lib/generated/prisma";
import { DiagnosisWithUser } from "./diagnoses-columns";
import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DistrictDiagnosesModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnoses: DiagnosisWithUser[];
  districtName: string;
}

export default function DistrictDiagnosesModal({
  isOpen,
  onClose,
  diagnoses,
  districtName,
}: DistrictDiagnosesModalProps) {
  if (!isOpen) return null;

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
            <h3 className="font-bold text-lg">
              {districtName} Diagnoses
            </h3>
            <p className="text-sm text-base-content/70">
              Showing {diagnoses.length} diagnosis{diagnoses.length !== 1 ? "es" : ""}
            </p>
          </div>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto bg-base-100 flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Disease</TableHead>
                <TableHead>Diagnosis Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {diagnoses.length > 0 ? (
                diagnoses.map((diagnosis) => (
                  <TableRow key={diagnosis.id}>
                    <TableCell>
                      {diagnosis.user?.name || "—"}
                    </TableCell>
                    <TableCell>
                      {diagnosis.user?.age ?? "—"}
                    </TableCell>
                    <TableCell>
                      {diagnosis.user?.gender
                        ? diagnosis.user.gender.charAt(0).toUpperCase() +
                          diagnosis.user.gender.slice(1).toLowerCase()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={
                        [diagnosis.barangay, diagnosis.city, diagnosis.district, diagnosis.province]
                          .filter(Boolean)
                          .join(", ") || "—"
                      }>
                        {[diagnosis.barangay, diagnosis.city, diagnosis.district, diagnosis.province]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </div>
                    </TableCell>
                    <TableCell>{diagnosis.disease}</TableCell>
                    <TableCell>
                      {diagnosis.createdAt
                        ? new Date(diagnosis.createdAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No diagnoses found for this district.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </dialog>
  );
}
