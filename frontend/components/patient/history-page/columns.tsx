"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import Link from "next/link";
import DeleteChatButton from "./delete-chat-button";

export type HistoryRow = {
  id: string; // chatId
  diagnosis: string;
  reliabilityLabel: string | null;
  reliabilityBadgeClass: string | null;
  reliabilityRank: number | null;
  createdAt: Date;
};

export const columns: ColumnDef<HistoryRow>[] = [
  {
    accessorKey: "diagnosis",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-primary"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Suggested Condition
          <ArrowUpDown className="w-4 h-4" />
        </button>
      );
    },
    cell: ({ row }) => {
      const diagnosis = row.getValue("diagnosis") as string;
      return <span className="font-medium">{diagnosis}</span>;
    },
    // filterFn is customized for both global search and exact select matching if needed
    // or we can stick to includesString and it will work with Selects if we use exact values
  },
  {
    accessorKey: "reliabilityRank",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-primary"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Reliability
          <ArrowUpDown className="w-4 h-4" />
        </button>
      );
    },
    cell: ({ row }) => {
      const rank = row.getValue("reliabilityRank") as number | null;
      if (rank === null) {
        return <span className="text-muted">—</span>;
      }

      const label = row.original.reliabilityLabel;
      const badgeClass = row.original.reliabilityBadgeClass;
      if (!label || !badgeClass) {
        return <span className="text-muted">—</span>;
      }

      return (
        <span className={`badge ${badgeClass} badge-sm whitespace-nowrap`}>
          {label}
        </span>
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
      const date = row.getValue("createdAt") as Date;
      return (
        <div className="flex flex-col">
          <span className="font-medium text-sm text-base-content/80">
            {date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="text-muted text-xs">
            {date.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </span>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const chat = row.original;
      return (
        <div className="flex items-center gap-2 justify-end">
          <Link
            href={`/diagnosis/${chat.id}`}
            className="btn btn-ghost btn-sm tooltip"
            data-tip="View Details"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
          <DeleteChatButton chatId={chat.id} />
        </div>
      );
    },
  },
];
