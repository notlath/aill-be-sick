"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Info, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import UsersPageActions from "./users-page-actions";

export type UserRow = {
  id: number;
  name: string | null;
  email: string;
  gender: string | null;
  age: number | null;
  district: string | null;
  role: string;
  createdAt: Date;
  lastActivityAt: Date | null;
  privacyAcceptedAt: Date | null;
  privacyVersion: string | null;
  termsAcceptedAt: Date | null;
  termsVersion: string | null;
  _count: {
    diagnoses: number;
  };
};

export const columns: ColumnDef<UserRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => {
      const name = row.getValue("name") as string | null;
      const email = row.original.email;
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{name || "—"}</span>
          <span className="text-xs text-muted">{email}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "age",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Age
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => {
      const age = row.getValue("age") as number | null;
      return <span>{age ?? "—"}</span>;
    },
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
    accessorKey: "district",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        District
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => {
      const district = row.getValue("district") as string | null;
      return (
        <div className="max-w-36 truncate" title={district || "—"}>
          {district || "—"}
        </div>
      );
    },
  },
  {
    id: "diagnoses",
    accessorFn: (row) => row._count.diagnoses,
    header: ({ column }) => (
      <div className="flex items-center gap-1">
        <button
          className="flex items-center gap-1 hover:text-primary"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Symptom Checks
          <ArrowUpDown className="w-4 h-4" />
        </button>
        <div
          className="tooltip tooltip-bottom z-50"
          data-tip="Number of times this person used the symptom checker"
        >
          <Info className="w-3.5 h-3.5 text-muted cursor-default" />
        </div>
      </div>
    ),
    cell: ({ row }) => {
      const count = row.getValue("diagnoses") as number;
      return <span>{count}</span>;
    },
  },
  {
    accessorKey: "lastActivityAt",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Last Activity
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => {
      const date = row.getValue("lastActivityAt") as Date | null;
      if (!date) return <span className="text-muted">No activity</span>;
      return <span>{new Date(date).toLocaleDateString()}</span>;
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Joined
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return <span>{date.toLocaleDateString()}</span>;
    },
  },
  {
    id: "consentStatus",
    header: "Consent Status",
    cell: ({ row }) => {
      const privacyAcceptedAt = row.original.privacyAcceptedAt;
      const termsAcceptedAt = row.original.termsAcceptedAt;
      const privacyVersion = row.original.privacyVersion;
      const termsVersion = row.original.termsVersion;

      const hasPrivacy = !!privacyAcceptedAt;
      const hasTerms = !!termsAcceptedAt;

      if (hasPrivacy && hasTerms) {
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="default" className="bg-success text-success-content">
              <CheckCircle className="w-3 h-3 mr-1" />
              Compliant
            </Badge>
            <span className="text-xs text-muted">
              Privacy v{privacyVersion || "1.0"}
            </span>
          </div>
        );
      } else if (hasPrivacy || hasTerms) {
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="default" className="bg-warning text-warning-content">
              <Clock className="w-3 h-3 mr-1" />
              Partial
            </Badge>
            <span className="text-xs text-muted">
              Missing {hasPrivacy ? "terms" : "privacy"}
            </span>
          </div>
        );
      } else {
        return (
          <Badge variant="default" className="bg-error text-error-content">
            <XCircle className="w-3 h-3 mr-1" />
            Not Consented
          </Badge>
        );
      }
    },
    filterFn: (row, id, value) => {
      const privacyAcceptedAt = row.original.privacyAcceptedAt;
      const termsAcceptedAt = row.original.termsAcceptedAt;

      if (value === "compliant") return !!privacyAcceptedAt && !!termsAcceptedAt;
      if (value === "partial") return (!!privacyAcceptedAt || !!termsAcceptedAt) && !(!!privacyAcceptedAt && !!termsAcceptedAt);
      if (value === "not_consented") return !privacyAcceptedAt && !termsAcceptedAt;
      return true;
    },
  },
  {
    id: "actions",
    header: () => "Actions",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex items-center gap-2">
          <UsersPageActions
            currentUserRole="CLINICIAN"
            userId={user.id.toString()}
            userEmail={user.email}
          />
        </div>
      );
    },
  },
];
