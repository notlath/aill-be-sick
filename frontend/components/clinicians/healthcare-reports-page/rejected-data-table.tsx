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
import { Search, X, Loader2 } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { useAction } from "next-safe-action/hooks";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { RejectedDiagnosisRow } from "./rejected-columns";
import { revertDiagnosis } from "@/actions/revert-diagnosis";
import { DISEASE_SELECT_OPTIONS } from "@/constants/diseases";
import { ReportDetailModal } from "./report-detail-modal";
import { createPortal } from "react-dom";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

type SortOption = {
  value: string;
  label: string;
  desc: boolean;
};

const sortOptions: SortOption[] = [
  { value: "disease", label: "Disease (A-Z)", desc: false },
  { value: "disease", label: "Disease (Z-A)", desc: true },
  { value: "rejectedAt", label: "Oldest First", desc: false },
  { value: "rejectedAt", label: "Newest First", desc: true },
];

export function RejectedDataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [isMounted, setIsMounted] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<RejectedDiagnosisRow | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { execute: executeRevert } = useAction(revertDiagnosis, {
    onSuccess: ({ data }) => {
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      if (data?.success) {
        toast.success("Diagnosis reverted successfully");
      }
    },
    onError: () => {
      toast.error("Failed to revert diagnosis");
    },
  });

  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedDisease, setSelectedDisease] = useState("");

  const filteredData = useMemo(() => {
    let rows = data as RejectedDiagnosisRow[];

    if (selectedDisease) {
      rows = rows.filter((r) => r.disease === selectedDisease);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      rows = rows.filter((r) => new Date(r.submittedAt) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      rows = rows.filter((r) => new Date(r.submittedAt) <= to);
    }

    return rows as TData[];
  }, [data, selectedDisease, dateFrom, dateTo]);

  const handleUndo = (diagnosisId: number) => {
    if (processingIds.has(diagnosisId)) return;
    setProcessingIds((prev) => new Set(prev).add(diagnosisId));
    executeRevert({ diagnosisId });
    setTimeout(() => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(diagnosisId);
        return next;
      });
    }, 5000);
  };

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    meta: {
      onUndo: handleUndo,
      openDiagnosisModal: (row: RejectedDiagnosisRow) => {
        setSelectedDiagnosis(row);
        setDetailModalOpen(true);
      },
    },
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
      (opt) => opt.value === current.id && opt.desc === current.desc
    );
    return option?.label || "Sort by...";
  }, [sorting]);

  const hasActiveFilters =
    globalFilter || selectedDisease || dateFrom || dateTo;

  const clearAllFilters = () => {
    setGlobalFilter("");
    setSelectedDisease("");
    setDateFrom("");
    setDateTo("");
    table.setPageIndex(0);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/60 z-10 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search rejected diagnoses..."
                value={globalFilter ?? ""}
                onChange={(e) => {
                  setGlobalFilter(e.target.value);
                  table.setPageIndex(0);
                }}
                className="pl-10 h-10 w-full"
              />
              {globalFilter && (
                <button
                  onClick={() => {
                    setGlobalFilter("");
                    table.setPageIndex(0);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content z-10 p-1"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <Select
                value={currentSortLabel}
                onValueChange={handleSortChange}
                className="w-auto"
              >
                <SelectTrigger className="w-48 shrink-0 h-10 text-sm">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.label} value={option.label}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedDisease}
                onValueChange={(value) => {
                  setSelectedDisease(value === "all" ? "" : value);
                  table.setPageIndex(0);
                }}
                className="w-auto"
              >
                <SelectTrigger className="w-44 shrink-0 h-10 text-sm">
                  <SelectValue placeholder="All Diseases" />
                </SelectTrigger>
                <SelectContent>
                  {DISEASE_SELECT_OPTIONS.map((disease) => (
                    <SelectItem key={disease.value} value={disease.value}>
                      {disease.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DatePicker
                value={dateFrom}
                onChange={(date) => {
                  setDateFrom(date);
                  table.setPageIndex(0);
                }}
                placeholder="Date From"
                className="w-[150px] shrink-0 h-10"
              />

              <DatePicker
                value={dateTo}
                onChange={(date) => {
                  setDateTo(date);
                  table.setPageIndex(0);
                }}
                placeholder="Date To"
                className="w-[150px] shrink-0 h-10"
              />

              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="btn btn-ghost h-10 px-3 shrink-0 text-base-content/60 hover:text-base-content"
                  type="button"
                  title="Clear filters"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-base-200 border border-border rounded-xl mx-auto overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="table w-full whitespace-nowrap lg:whitespace-normal">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="text-left first:pl-6 last:pr-6 whitespace-nowrap">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                    </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => {
                    const diagnosis = row.original as RejectedDiagnosisRow;
                    const isProcessing = processingIds.has(diagnosis.id);

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-base-200/50 transition-colors"
                      >
                        {row.getVisibleCells().map((cell) => {
                          if (cell.column.id === "actions" && isProcessing) {
                            return (
                              <td key={cell.id} className="first:pl-6 last:pr-6 py-4">
                                <div className="flex items-center gap-2">
                                  <Loader2 className="size-5 animate-spin text-primary" />
                                  <span className="text-sm text-base-content/60">Processing...</span>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={cell.id} className="first:pl-6 last:pr-6 py-4">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="h-24 text-center">
                      {hasActiveFilters
                        ? "No rejected diagnoses match your filters."
                        : "No rejected diagnoses."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-2">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-sm text-base-content/60">Rows per page:</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
                table.setPageIndex(0);
              }}
              className="w-auto"
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
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

      {isMounted && selectedDiagnosis && (
        <ReportDetailModal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedDiagnosis(null);
          }}
          report={{
            id: selectedDiagnosis.id,
            disease: selectedDiagnosis.disease,
            confidence: selectedDiagnosis.confidence,
            uncertainty: selectedDiagnosis.uncertainty,
            symptoms: selectedDiagnosis.symptoms,
            userId: selectedDiagnosis.userId,
            district: selectedDiagnosis.district,
            barangay: selectedDiagnosis.barangay,
            createdAt: selectedDiagnosis.createdAt,
            user: selectedDiagnosis.user,
            notes: selectedDiagnosis.notes,
            status: "REJECTED",
            rejectionReason: selectedDiagnosis.rejectionReason,
          }}
          onUndoRejection={() => handleUndo(selectedDiagnosis.id)}
        />
      )}
    </>
  );
}
