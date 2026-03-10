"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import {
  getSeverityBadgeClass,
  getSeverityLabel,
} from "@/utils/alert-severity";
import type { Alert } from "@/types";

const statusLabel: Record<Alert["status"], string> = {
  NEW: "New",
  ACKNOWLEDGED: "Acknowledged",
  DISMISSED: "Dismissed",
  RESOLVED: "Resolved",
};

const statusBadgeClass: Record<Alert["status"], string> = {
  NEW: "badge-error",
  ACKNOWLEDGED: "badge-success",
  DISMISSED: "badge-ghost",
  RESOLVED: "badge-info",
};

const typeLabel: Record<Alert["type"], string> = {
  ANOMALY: "Anomaly",
  LOW_CONFIDENCE: "Low Confidence",
  HIGH_UNCERTAINTY: "High Uncertainty",
};

export const columns: ColumnDef<Alert>[] = [
  {
    accessorKey: "severity",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Severity
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => {
      const severity = row.getValue("severity") as Alert["severity"];
      return (
        <span className={`badge badge-sm ${getSeverityBadgeClass(severity)}`}>
          {getSeverityLabel(severity)}
        </span>
      );
    },
    sortingFn: (a, b) => {
      const order = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
      return (
        (order[a.getValue("severity") as Alert["severity"]] ?? 0) -
        (order[b.getValue("severity") as Alert["severity"]] ?? 0)
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as Alert["status"];
      return (
        <span className={`badge badge-sm ${statusBadgeClass[status]}`}>
          {statusLabel[status]}
        </span>
      );
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("type") as Alert["type"];
      return <span className="text-sm">{typeLabel[type]}</span>;
    },
  },
  {
    accessorKey: "message",
    header: "Message",
    cell: ({ row }) => {
      const message = row.getValue("message") as string;
      return (
        <div className="max-w-64 truncate text-sm" title={message}>
          {message}
        </div>
      );
    },
  },
  {
    accessorKey: "diagnosisId",
    header: "Diagnosis ID",
    cell: ({ row }) => {
      const id = row.getValue("diagnosisId") as number | null;
      return <span className="text-sm">{id ?? "—"}</span>;
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
      return <span className="text-sm whitespace-nowrap">{date.toLocaleDateString()}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const alert = row.original;
      const isPending = alert.status === "NEW";

      return (
        <div className="flex items-center justify-end gap-1 relative z-10">
          <button
            onClick={() => (table.options.meta as any)?.openDetailModal?.(alert)}
            className="btn btn-ghost btn-sm tooltip"
            data-tip="View Details"
          >
            <ExternalLink className="w-4 h-4" />
          </button>

          {isPending && (
            <>
              <button
                onClick={() => (table.options.meta as any)?.acknowledge?.(alert.id)}
                className="btn btn-ghost btn-sm tooltip text-success"
                data-tip="Acknowledge"
              >
                ✓
              </button>
              <button
                onClick={() => (table.options.meta as any)?.dismiss?.(alert.id)}
                className="btn btn-ghost btn-sm tooltip text-base-content/40"
                data-tip="Dismiss"
              >
                ✕
              </button>
            </>
          )}
        </div>
      );
    },
  },
];
