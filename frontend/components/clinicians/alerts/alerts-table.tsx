"use client";

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
import { Search, X } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Alert } from "@/types";
import { getReasonLabel, getReasonDescription } from "@/utils/anomaly-reasons";
import { getSeverityBadgeClass, getSeverityLabel } from "@/utils/alert-severity";
import { AlertDetailModal } from "./alert-detail-modal";

const SORT_OPTIONS = [
  { label: "Date (Newest)", id: "createdAt", desc: true },
  { label: "Date (Oldest)", id: "createdAt", desc: false },
  { label: "Severity (High-Low)", id: "severity", desc: true },
  { label: "Severity (Low-High)", id: "severity", desc: false },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "NEW", label: "New" },
  { value: "ACKNOWLEDGED", label: "Acknowledged" },
  { value: "DISMISSED", label: "Dismissed" },
];

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Severities" },
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

interface AlertsTableProps {
  columns: ColumnDef<Alert, any>[];
  data: Alert[];
  onAcknowledge: (id: number) => Promise<void>;
  onDismiss: (id: number) => Promise<void>;
}

export function AlertsTable({
  columns,
  data,
  onAcknowledge,
  onDismiss,
}: AlertsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: { sorting, columnFilters, globalFilter, pagination },
    meta: {
      openDetailModal: (alert: Alert) => {
        setSelectedAlert(alert);
        setIsModalOpen(true);
      },
      acknowledge: onAcknowledge,
      dismiss: onDismiss,
    },
  });

  const pageSizeOptions = useMemo(() => [10, 25, 50, 100], []);

  const currentSortLabel = useMemo(() => {
    if (sorting.length === 0) return "Sort by...";
    const s = sorting[0];
    return SORT_OPTIONS.find((o) => o.id === s.id && o.desc === s.desc)?.label ?? "Sort by...";
  }, [sorting]);

  const handleSortChange = (label: string) => {
    const opt = SORT_OPTIONS.find((o) => o.label === label);
    if (opt) {
      setSorting([{ id: opt.id, desc: opt.desc }]);
      table.setPageIndex(0);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Search + Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72 mt-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/60 z-10 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search alerts..."
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-base-content z-10"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={currentSortLabel} onValueChange={handleSortChange}
            className="w-auto">
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.label} value={o.label}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={(table.getColumn("status")?.getFilterValue() as string) ?? ""}
              onValueChange={(v) => {
                table.getColumn("status")?.setFilterValue(v || undefined);
                table.setPageIndex(0);
              }}
              className="w-auto"
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={(table.getColumn("severity")?.getFilterValue() as string) ?? ""}
              onValueChange={(v) => {
                table.getColumn("severity")?.setFilterValue(v || undefined);
                table.setPageIndex(0);
              }}
              className="w-auto"
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-base-100 border border-border rounded-xl mx-auto overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="table w-full whitespace-nowrap lg:whitespace-normal">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="text-left first:pl-6 last:pr-6 whitespace-nowrap"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-base-200/50 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="first:pl-6 last:pr-6 py-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="h-24 text-center text-base-content/60">
                      {globalFilter || columnFilters.length > 0
                        ? "No alerts match your filters."
                        : "No alerts at this time."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-2">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-sm text-base-content/60">Rows per page:</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(v) => {
                table.setPageSize(Number(v));
                table.setPageIndex(0);
              }}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-base-content/60">
              {table.getFilteredRowModel().rows.length > 0
                ? `${pagination.pageIndex * pagination.pageSize + 1} - ${Math.min(
                    (pagination.pageIndex + 1) * pagination.pageSize,
                    table.getFilteredRowModel().rows.length
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

      {isMounted ? createPortal(
        <AlertDetailModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedAlert(null);
          }}
          alert={selectedAlert}
          onAcknowledge={onAcknowledge}
          onDismiss={onDismiss}
        />,
        document.body
      ) : null}
    </>
  );
}
