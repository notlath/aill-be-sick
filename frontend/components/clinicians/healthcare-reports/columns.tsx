"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

export type DiagnosisRow = {
  id: number;
  disease: string;
  confidence: number;
  uncertainty: number;
  symptoms: string;
  modelUsed: string;
  createdAt: Date;
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
      return <span>{(confidence * 100).toFixed(2)}%</span>;
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
      return <span>{(uncertainty * 100).toFixed(2)}%</span>;
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
    accessorKey: "modelUsed",
    header: "Model",
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
];
