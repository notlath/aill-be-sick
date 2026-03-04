"use client";

import { User } from "@/lib/generated/prisma";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink } from "lucide-react";

export type DiagnosisRow = {
  id: number;
  disease: string;
  confidence: number;
  uncertainty: number;
  symptoms: string;
  userId: number;
  createdAt: Date;
  user?: User;
};

export const columns: ColumnDef<DiagnosisRow>[] = [
  {
    accessorKey: "disease",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-primary"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Disease
          <ArrowUpDown className="w-4 h-4" />
        </button>
      );
    },
  },
  {
    accessorKey: "confidence",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-primary"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Confidence
          <ArrowUpDown className="w-4 h-4" />
        </button>
      );
    },
    cell: ({ row }) => {
      const confidence = parseFloat(row.getValue("confidence"));
      return <span>{(confidence * 100).toFixed(4)}%</span>;
    },
  },
  {
    accessorKey: "uncertainty",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-primary"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Uncertainty
          <ArrowUpDown className="w-4 h-4" />
        </button>
      );
    },
    cell: ({ row }) => {
      const uncertainty = parseFloat(row.getValue("uncertainty"));
      return <span>{uncertainty.toFixed(4)}%</span>;
    },
  },
  {
    accessorKey: "symptoms",
    header: "Symptoms",
    cell: ({ row }) => {
      const symptoms = row.getValue("symptoms") as string;
      return (
        <div className="max-w-24 truncate" title={symptoms}>
          {symptoms}
        </div>
      );
    },
  },
  {
    accessorKey: "userId",
    header: "Patient ID",
    cell: ({ row, table }) => {
      const userId = row.getValue("userId") as number;
      return (
        <button
          onClick={() => (table.options.meta as any)?.openPatientModal?.(row.original.user)}
          className="font-medium text-primary hover:underline"
        >
          {userId}
        </button>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-primary"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="w-4 h-4" />
        </button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return <span>{date.toLocaleDateString()}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      return (
        <div className="flex items-center justify-end z-10 relative">
          <button
            onClick={() => (table.options.meta as any)?.openDiagnosisModal?.(row.original)}
            className="btn btn-ghost btn-sm tooltip"
            data-tip="View Details"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      );
    },
  },
];
