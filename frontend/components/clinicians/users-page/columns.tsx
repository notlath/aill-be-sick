"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

export type UserRow = {
  id: number;
  name: string | null;
  email: string;
  gender: string | null;
  age: number | null;
  city: string | null;
  region: string | null;
  role: string;
  createdAt: Date;
  _count: {
    diagnoses: number;
  };
};

export const columns: ColumnDef<UserRow>[] = [
  {
    accessorKey: "name",
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
      const name = row.getValue("name") as string | null;
      return <span>{name || "—"}</span>;
    },
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "gender",
    header: "Gender",
    filterFn: "equalsString",
    cell: ({ row }) => {
      const gender = row.getValue("gender") as string | null;
      return <span>{gender || "—"}</span>;
    },
  },
  {
    accessorKey: "age",
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
      const age = row.getValue("age") as number | null;
      return <span>{age ?? "—"}</span>;
    },
  },
  {
    accessorKey: "region",
    header: "Region",
    cell: ({ row }) => {
      const region = row.getValue("region") as string | null;
      const city = row.original.city;
      const display = [city, region].filter(Boolean).join(", ");
      return (
        <div className="max-w-32 truncate" title={display || "—"}>
          {display || "—"}
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    filterFn: "equals",
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      const badgeClass =
        role === "CLINICIAN"
          ? "badge-primary"
          : role === "DEVELOPER"
            ? "badge-secondary"
            : "badge-ghost";
      return (
        <span className={`badge badge-sm ${badgeClass}`}>
          {role.charAt(0) + role.slice(1).toLowerCase()}
        </span>
      );
    },
  },
  {
    id: "diagnoses",
    accessorFn: (row) => row._count.diagnoses,
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-primary"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Diagnoses
          <ArrowUpDown className="w-4 h-4" />
        </button>
      );
    },
    cell: ({ row }) => {
      const count = row.getValue("diagnoses") as number;
      return <span>{count}</span>;
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
          Joined
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
