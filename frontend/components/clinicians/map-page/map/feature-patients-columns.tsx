"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { Diagnosis, User } from "@/lib/generated/prisma";
import { format } from "date-fns";

export type DiagnosisWithUser = Diagnosis & { user: User };

export const featurePatientsColumns: ColumnDef<DiagnosisWithUser>[] = [
  {
    accessorKey: "userId",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-primary whitespace-nowrap"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Patient ID
          <ArrowUpDown className="w-4 h-4 ml-1" />
        </button>
      );
    },
    cell: ({ row }) => {
      return <span>{row.getValue("userId")}</span>;
    },
  },
  {
    id: "patient_name",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-primary whitespace-nowrap"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="w-4 h-4 ml-1" />
        </button>
      );
    },
    accessorFn: (row) => row.user?.name,
    cell: ({ row }) => {
      const name = row.getValue("patient_name") as string | undefined;
      return <span>{name || "—"}</span>;
    },
  },
  {
    id: "patient_age",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-primary whitespace-nowrap"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Age
          <ArrowUpDown className="w-4 h-4 ml-1" />
        </button>
      );
    },
    accessorFn: (row) => row.user?.age,
    cell: ({ row }) => {
      const age = row.getValue("patient_age") as number | undefined;
      return <span>{age ?? "—"}</span>;
    },
  },
  {
    id: "patient_gender",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-primary whitespace-nowrap"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Gender
          <ArrowUpDown className="w-4 h-4 ml-1" />
        </button>
      );
    },
    accessorFn: (row) => row.user?.gender,
    filterFn: "equalsString",
    cell: ({ row }) => {
      const gender = row.getValue("patient_gender") as string | undefined;
      if (!gender) return <span>—</span>;
      const displayGender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
      return <span>{displayGender}</span>;
    },
  },
  {
    id: "district",
    header: "District",
    accessorFn: (row) => row.district,
    filterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const value = row.getValue(columnId) as string;
      if (!value) return false;
      return value.toLowerCase().includes(search);
    },
    cell: ({ row }) => {
      const display = row.getValue("district") as string;
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
          <ArrowUpDown className="w-4 h-4 ml-1" />
        </button>
      );
    },
    cell: ({ row }) => {
      return <span>{row.getValue("disease")}</span>;
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-primary whitespace-nowrap"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Diagnosis Date
          <ArrowUpDown className="w-4 h-4 ml-1" />
        </button>
      );
    },
    cell: ({ row }) => {
      const dateStr = row.getValue("createdAt") as Date;
      if (!dateStr) return <span>—</span>;
      return <span className="whitespace-nowrap">{format(new Date(dateStr), "M/d/yyyy")}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => (
      <div className="flex items-center justify-end z-10 relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            (table.options.meta as any)?.openFeaturePatientDetail?.(row.original);
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
