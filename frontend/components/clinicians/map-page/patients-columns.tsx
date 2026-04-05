"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { IllnessRecord } from "@/types";
import { getReliability } from "@/utils/reliability";

export const columns: ColumnDef<IllnessRecord>[] = [
  {
    accessorKey: "patient_name",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-primary"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="w-4 h-4" />
        </button>
      );
    },
    cell: ({ row }) => {
      const name = row.getValue("patient_name") as string | null;
      return <span>{name || "—"}</span>;
    },
  },
  {
    accessorKey: "patient_age",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-primary"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Age
          <ArrowUpDown className="w-4 h-4" />
        </button>
      );
    },
    cell: ({ row }) => {
      const age = row.getValue("patient_age") as number | null;
      return <span>{age ?? "—"}</span>;
    },
  },
  {
    accessorKey: "patient_gender",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-primary"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Gender
          <ArrowUpDown className="w-4 h-4" />
        </button>
      );
    },
    filterFn: "equalsString",
    cell: ({ row }) => {
      const gender = row.getValue("patient_gender") as string | null;
      if (!gender) return <span>—</span>;
      const displayGender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
      return <span>{displayGender}</span>;
    },
  },
  {
    id: "location",
    header: "District",
    accessorFn: (row) => {
      const district = row.district;
      return district;
    },
    filterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const value = row.getValue(columnId) as string;
      return value?.toLowerCase().includes(search) ?? false;
    },
    cell: ({ row }) => {
      const display = row.getValue("location") as string | null;
      return (
        <div className="max-w-sm truncate" title={display || "—"}>
          {display || "—"}
        </div>
      );
    },
  },
  {
    accessorKey: "disease",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-primary"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Diagnosis
          <ArrowUpDown className="w-4 h-4" />
        </button>
      );
    },
    cell: ({ row }) => {
      return <span>{row.getValue("disease")}</span>;
    },
  },
  {
    accessorKey: "diagnosed_at",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-primary"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Diagnosis Date
          <ArrowUpDown className="w-4 h-4" />
        </button>
      );
    },
    cell: ({ row }) => {
      const dateStr = row.getValue("diagnosed_at") as string | null;
      if (!dateStr) return <span>—</span>;
      return <span>{new Date(dateStr).toLocaleDateString()}</span>;
    },
  },
  {
    id: "severity",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-primary"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Severity
          <ArrowUpDown className="w-4 h-4" />
        </button>
      );
    },
    accessorFn: (row) => {
      const { label } = getReliability(row.confidence, row.uncertainty);
      return label;
    },
    cell: ({ row }) => {
      const label = row.getValue("severity") as string;
      const badgeClass = 
        label === "Reliable" 
          ? "badge-success" 
          : label === "Review Recommended" 
            ? "badge-warning" 
            : "badge-error";
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
          onClick={(e) => {
            e.stopPropagation();
            (table.options.meta as any)?.openPatientDetail?.(row.original);
          }}
          className="btn btn-ghost btn-sm tooltip"
          data-tip="View Details"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    ),
  },
];
