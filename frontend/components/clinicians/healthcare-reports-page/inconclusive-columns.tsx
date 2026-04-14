"use client";

import type { ClinicalVerificationStatus } from "@/types/clinical-verification";
import { User } from "@/lib/generated/prisma";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Clock } from "lucide-react";

export type DiagnosisNoteRow = {
  id: number;
  content: string;
  createdAt: Date;
  clinician: {
    id: number;
    name: string | null;
  };
};

export type InconclusiveDiagnosisRow = {
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
  clinicalVerification?: unknown;
  clinicalVerificationStatus?: ClinicalVerificationStatus | null;
};

export const inconclusiveColumns: ColumnDef<InconclusiveDiagnosisRow>[] = [
  {
    accessorKey: "disease",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Suggested Condition
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => {
      const disease = row.original.disease;
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{disease}</span>
          <span className="badge badge-soft badge-sm">Inconclusive</span>
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
      const patientId = row.original.patientId;
      return (
        <span
          className="font-mono text-sm text-base-content/80"
          title="Anonymized patient identifier for privacy"
        >
          {patientId}
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
    accessorKey: "submittedAt",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Submitted
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("submittedAt"));
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let timeAgo;
      if (diffHours < 1) {
        timeAgo = "Just now";
      } else if (diffHours < 24) {
        timeAgo = `${diffHours}h ago`;
      } else if (diffDays < 7) {
        timeAgo = `${diffDays}d ago`;
      } else {
        timeAgo = date.toLocaleDateString();
      }

      return (
        <div className="flex items-center gap-1.5">
          <Clock className="size-4 text-base-content/50" />
          <span className="text-sm">{timeAgo}</span>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row, table }) => {
      const diagnosis = row.original;
      const handleApprove = (table.options.meta as any)?.onApprove;
      const handleReject = (table.options.meta as any)?.onReject;
      const openDiagnosisModal = (table.options.meta as any)?.openDiagnosisModal;

      return (
        <div className="flex flex-col gap-1 min-w-[80px]">
          <button
            onClick={() => handleApprove?.(diagnosis.id)}
            className="btn btn-success btn-sm btn-block text-xs"
          >
            Verify
          </button>
          <button
            onClick={() => handleReject?.(diagnosis.id)}
            className="btn btn-outline btn-error btn-sm btn-block text-xs"
          >
            Reject
          </button>
          <button
            onClick={() => openDiagnosisModal?.(diagnosis)}
            className="btn btn-ghost btn-sm btn-block text-xs"
          >
            Details
          </button>
        </div>
      );
    },
  },
];
