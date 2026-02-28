"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import Link from "next/link";
import DeleteChatButton from "./delete-chat-button";

export type HistoryRow = {
  id: string; // chatId
  diagnosis: string;
  uncertainty: number | null;
  confidence: number | null;
  modelUsed: string | null;
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
          Diagnosis
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
    accessorKey: "modelUsed",
    header: "Model",
    cell: ({ row }) => {
      const model = row.getValue("modelUsed") as string | null;
      if (!model) return <span className="text-muted">—</span>;
      return (
        <span className="badge badge-sm badge-ghost">
          {model}
        </span>
      );
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
      const uncertainty = row.getValue("uncertainty") as number | null;
      if (uncertainty === null) return <span className="text-muted">—</span>;
      return <span>{(uncertainty * 100).toFixed(2)}%</span>;
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
      const confidence = row.getValue("confidence") as number | null;
      if (confidence === null) return <span className="text-muted">—</span>;
      return <span>{(confidence * 100).toFixed(2)}%</span>;
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
