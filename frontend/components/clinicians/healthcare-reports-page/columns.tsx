"use client";

import { User } from "@/lib/generated/prisma";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { getReliability } from "@/utils/reliability";

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
};

export const columns: ColumnDef<DiagnosisRow>[] = [
  {
    accessorKey: "disease",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Disease
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
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
    header: "Patient",
    cell: ({ row, table }) => {
      const name = row.original.user?.name ?? "Unknown";
      return (
        <button
          onClick={() => (table.options.meta as any)?.openPatientModal?.(row.original.user)}
          className="font-medium text-primary hover:underline text-left"
        >
          {name}
        </button>
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
