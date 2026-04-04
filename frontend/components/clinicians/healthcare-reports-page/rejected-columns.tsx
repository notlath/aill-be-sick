"use client";

import { User } from "@/lib/generated/prisma";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink, RotateCcw } from "lucide-react";
import { getAnonymizedPatientId } from "@/utils/patient";

export type DiagnosisNoteRow = {
  id: number;
  content: string;
  createdAt: Date;
  clinician: {
    id: number;
    name: string | null;
  };
};

export type RejectedDiagnosisRow = {
  id: number;
  disease: string;
  confidence: number;
  uncertainty: number;
  symptoms: string;
  userId: number;
  chatId: string;
  district?: string | null;
  barangay?: string | null;
  createdAt: Date;
  patientId: string;
  submittedAt: Date;
  user?: User;
  notes?: DiagnosisNoteRow[];
  rejectedByUser?: { id: number; name: string | null } | null;
  rejectedAt?: Date | null;
  rejectionReason?: string;
};

export const rejectedColumns: ColumnDef<RejectedDiagnosisRow>[] = [
  {
    accessorKey: "disease",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Condition
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => {
      const disease = row.original.disease;
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{disease}</span>
          <span className="badge badge-error badge-soft badge-sm">Rejected</span>
        </div>
      );
    },
  },
  {
    accessorKey: "symptoms",
    header: "Symptoms",
    cell: ({ row }) => {
      const symptoms = row.getValue("symptoms") as string;
      return (
        <div className="max-w-48 truncate" title={symptoms}>
          <span className="text-sm text-base-content/70">{symptoms}</span>
        </div>
      );
    },
  },
  {
    id: "patient",
    header: "Patient ID",
    cell: ({ row }) => {
      const anonymizedId = getAnonymizedPatientId(row.original.userId);
      return (
        <span
          className="font-mono text-sm text-base-content/80"
          title="Anonymized patient identifier for privacy"
        >
          {anonymizedId}
        </span>
      );
    },
  },
  {
    id: "location",
    header: "Location",
    cell: ({ row }) => {
      const district = row.original.district;
      const barangay = row.original.barangay;
      const location = district ?? barangay ?? "—";
      return <span className="text-sm">{location}</span>;
    },
  },
  {
    id: "rejectionReason",
    header: "Rejection Reason",
    cell: ({ row }) => {
      const reason = row.original.rejectionReason;
      if (!reason) {
        return <span className="text-sm text-base-content/40 italic">No reason provided</span>;
      }
      return (
        <div className="max-w-56 truncate" title={reason}>
          <span className="text-sm text-error">{reason}</span>
        </div>
      );
    },
  },
  {
    id: "rejectedBy",
    header: "Rejected By",
    cell: ({ row }) => {
      const rejectedBy = row.original.rejectedByUser;
      return <span className="text-sm">{rejectedBy?.name ?? "Unknown"}</span>;
    },
  },
  {
    accessorKey: "rejectedAt",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Rejected At
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => {
      const rejectedAt = row.original.rejectedAt;
      if (!rejectedAt) {
        return <span className="text-sm text-base-content/40">—</span>;
      }
      const date = new Date(rejectedAt);
      return <span className="text-sm">{date.toLocaleDateString()}</span>;
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row, table }) => {
      const diagnosis = row.original;
      const handleUndo = (table.options.meta as any)?.onUndo;
      const openDiagnosisModal = (table.options.meta as any)?.openDiagnosisModal;

      return (
        <div className="flex flex-col gap-1 min-w-[80px]">
          <button
            onClick={() => handleUndo?.(diagnosis.id)}
            className="btn btn-outline btn-warning btn-sm btn-block text-xs gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            Undo
          </button>
          <button
            onClick={() => openDiagnosisModal?.(diagnosis)}
            className="btn btn-ghost btn-sm btn-block text-xs"
          >
            <ExternalLink className="size-4" />
            Details
          </button>
        </div>
      );
    },
  },
];
