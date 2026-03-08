"use client";

import { useEffect, useRef } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SurveillanceAnomaly } from "@/types";

// ─── Column definitions ───────────────────────────────────────────────────────

const anomalyColumns: ColumnDef<SurveillanceAnomaly>[] = [
  {
    accessorKey: "user_id",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Patient ID
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => <span>{row.getValue("user_id")}</span>,
  },
  {
    accessorKey: "user_name",
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
      const name = row.getValue("user_name") as string | null;
      return <span>{name || "—"}</span>;
    },
  },
  {
    accessorKey: "disease",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Diagnosis
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => <span>{row.getValue("disease")}</span>,
  },
  {
    accessorKey: "anomaly_score",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Anomaly Score
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => {
      const score = row.getValue("anomaly_score") as number;
      return <span>{score.toFixed(4)}</span>;
    },
  },
  {
    id: "location",
    header: "Location",
    accessorFn: (row) => {
      return [row.barangay, row.city, row.region].filter(Boolean).join(", ");
    },
    filterFn: (row, columnId, filterValue) => {
      const search = (filterValue as string).toLowerCase();
      const value = row.getValue(columnId) as string;
      return value.toLowerCase().includes(search);
    },
    cell: ({ row }) => {
      const display = row.getValue("location") as string;
      return (
        <div className="max-w-sm truncate" title={display || "—"}>
          {display || "—"}
        </div>
      );
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
      return <span>{district || "—"}</span>;
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Diagnosis Date
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => {
      const dateStr = row.getValue("created_at") as string | null;
      if (!dateStr) return <span>—</span>;
      return <span>{new Date(dateStr).toLocaleDateString()}</span>;
    },
  },
];

// ─── Data table ───────────────────────────────────────────────────────────────

type SortOption = { value: string; label: string; desc: boolean };

const sortOptions: SortOption[] = [
  { value: "user_name", label: "Name (A-Z)", desc: false },
  { value: "user_name", label: "Name (Z-A)", desc: true },
  { value: "anomaly_score", label: "Anomaly Score (Low-High)", desc: false },
  { value: "anomaly_score", label: "Anomaly Score (High-Low)", desc: true },
  { value: "disease", label: "Diagnosis (A-Z)", desc: false },
  { value: "disease", label: "Diagnosis (Z-A)", desc: true },
  { value: "created_at", label: "Date (Oldest)", desc: false },
  { value: "created_at", label: "Date (Newest)", desc: true },
  { value: "user_id", label: "ID (Low-High)", desc: false },
  { value: "user_id", label: "ID (High-Low)", desc: true },
];

const AnomalyDataTable = ({ data }: { data: SurveillanceAnomaly[] }) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data,
    columns: anomalyColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const search = String(filterValue).toLowerCase();
      const value = row.getValue(columnId);
      if (value != null && String(value).toLowerCase().includes(search)) {
        return true;
      }
      if (columnId === "location") {
        const original = row.original as SurveillanceAnomaly;
        const loc = [original.barangay, original.city, original.region]
          .filter(Boolean)
          .join(", ")
          .toLowerCase();
        if (loc.includes(search)) return true;
      }
      return false;
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: { sorting, columnFilters, globalFilter, pagination },
  });

  const pageSizeOptions = useMemo(() => [10, 25, 50, 100], []);

  const handleSortChange = (value: string) => {
    const option = sortOptions.find((opt) => opt.label === value);
    if (option) {
      setSorting([{ id: option.value, desc: option.desc }]);
      table.setPageIndex(0);
    }
  };

  const currentSortLabel = useMemo(() => {
    if (sorting.length === 0) return "Sort by...";
    const current = sorting[0];
    const option = sortOptions.find(
      (opt) => opt.value === current.id && opt.desc === current.desc,
    );
    return option?.label ?? "Sort by...";
  }, [sorting]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted z-10" />
          <Input
            type="text"
            placeholder="Search anomalies..."
            value={globalFilter ?? ""}
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              table.setPageIndex(0);
            }}
            className="pl-10"
          />
          {globalFilter && (
            <button
              onClick={() => {
                setGlobalFilter("");
                table.setPageIndex(0);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-base-content"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select
          className="w-auto"
          value={currentSortLabel}
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent className="right-0 left-auto">
            {sortOptions.map((option) => (
              <SelectItem key={option.label} value={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-base-100 border border-border rounded-xl mx-auto overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="table w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="text-left font-semibold">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={anomalyColumns.length}
                    className="h-24 text-center"
                  >
                    {globalFilter || columnFilters.length > 0
                      ? "No results match your filters."
                      : "No results."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-2">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-sm text-muted">Rows per page:</span>
          <Select
            className="w-auto"
            value={String(pagination.pageSize)}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
              table.setPageIndex(0);
            }}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bottom-full top-auto mb-2">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">
            {table.getFilteredRowModel().rows.length > 0
              ? `${pagination.pageIndex * pagination.pageSize + 1} - ${Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  table.getFilteredRowModel().rows.length,
                )} of ${table.getFilteredRowModel().rows.length}`
              : "0 of 0"}
          </span>
          <button
            className="btn btn-sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            First
          </button>
          <button
            className="btn btn-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </button>
          <button
            className="btn btn-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
          <button
            className="btn btn-sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────

interface AnomalyPatientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  anomalies: SurveillanceAnomaly[];
}

const AnomalyPatientsModal = ({
  isOpen,
  onClose,
  title,
  anomalies,
}: AnomalyPatientsModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="modal [&::backdrop]:bg-black"
      onCancel={onClose}
      onClick={onClose}
    >
      <div
        className="modal-box w-11/12 max-w-7xl bg-base-100 p-0 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={handleContentClick}
      >
        <div className="p-6 border-b border-border flex justify-between items-center bg-base-100">
          <div>
            <h3 className="font-bold text-lg">{title}</h3>
            <p className="text-sm text-base-content/70">
              Showing {anomalies.length} anomal
              {anomalies.length !== 1 ? "ies" : "y"}
            </p>
          </div>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-base-100 flex-1">
          {anomalies.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-48">
              <p>No anomalies found for the selected filters.</p>
            </div>
          ) : (
            <AnomalyDataTable data={anomalies} />
          )}
        </div>
      </div>
    </dialog>
  );
};

export default AnomalyPatientsModal;
