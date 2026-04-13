"use client";

import type { ClinicalVerificationStatus } from "@/types/clinical-verification";
import { User } from "@/lib/generated/prisma";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink, FileCheck2 } from "lucide-react";
import { getReliability } from "@/utils/reliability";
import { getAnonymizedPatientId } from "@/utils/patient";

export type DiagnosisOverrideRow = {
  clinicianDisease: string;
  clinicianNotes: string | null;
  createdAt: Date;
};

export type DiagnosisNoteRow = {
  id: number;
  content: string;
  createdAt: Date;
  clinician: {
    id: number;
    name: string | null;
  };
};

export type DiagnosisRow = {
  id: number;
  disease: string;
  confidence: number;
  uncertainty: number;
  symptoms: string;
  userId: number;
  district?: string | null;
  barangay?: string | null;
  createdAt: Date;
  user?: User;
  override?: DiagnosisOverrideRow | null;
  notes?: DiagnosisNoteRow[];
  status?: string;
  rejectionReason?: string;
  clinicalVerification?: unknown;
  clinicalVerificationStatus?: ClinicalVerificationStatus | null;
};

export const columns: ColumnDef<DiagnosisRow>[] = [
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
      const hasOverride = row.original.override != null;
      const displayDisease = hasOverride
        ? row.original.override!.clinicianDisease
        : row.original.disease;

      return (
        <div className="flex items-center gap-1.5">
          <span>{displayDisease}</span>
          {hasOverride && (
            <span
              className="tooltip tooltip-right"
              data-tip="Clinician reviewed"
            >
              <FileCheck2 className="size-4 text-success" strokeWidth={2} />
            </span>
          )}
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
        <div className="max-w-40 truncate" title={symptoms}>
          {symptoms}
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
    accessorKey: "createdAt",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Date
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return <span>{date.toLocaleDateString()}</span>;
    },
  },
  {
    id: "reliability",
    header: "Reliability",
    cell: ({ row }) => {
      const { label, badgeClass } = getReliability(
        row.original.confidence,
        row.original.uncertainty
      );
      return (
        <span className={`badge ${badgeClass} badge-sm whitespace-nowrap`}>
          {label}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => (
      <div className="flex items-center justify-end z-10 relative">
        <button
          onClick={() => (table.options.meta as any)?.openDiagnosisModal?.(row.original)}
          className="btn btn-ghost btn-sm tooltip"
          data-tip="View Details"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    ),
  },
];
