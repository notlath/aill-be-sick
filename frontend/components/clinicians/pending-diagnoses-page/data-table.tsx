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
import { Search, X, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
import { PendingDiagnosisRow } from "./columns";
import { approveDiagnosis, rejectDiagnosis } from "@/actions/verify-diagnosis";

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
  { value: "submittedAt", label: "Oldest First", desc: false },
  { value: "submittedAt", label: "Newest First", desc: true },
];

export function PendingDiagnosesDataTable<TData, TValue>({
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
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<TData | null>(null);
  const [selectedDiagnosisId, setSelectedDiagnosisId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle approve diagnosis with useAction
  const { execute: executeApprove } = useAction(approveDiagnosis, {
    onSuccess: ({ data }) => {
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      if (data?.success) {
        toast.success(data.success as string);
        // Refresh the page to show updated data
        window.location.reload();
      }
    },
    onError: () => {
      toast.error("Failed to approve diagnosis");
    },
  });

  // Handle reject diagnosis with useAction
  const { execute: executeReject } = useAction(rejectDiagnosis, {
    onSuccess: ({ data }) => {
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      if (data?.success) {
        toast.success(data.success as string);
        // Refresh the page to show updated data
        window.location.reload();
      }
    },
    onError: () => {
      toast.error("Failed to reject diagnosis");
    },
  });

  // Extra client-side filters
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedDisease, setSelectedDisease] = useState("");

  // Apply all client-side filters manually
  const filteredData = useMemo(() => {
    let rows = data as PendingDiagnosisRow[];

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

  const handleApprove = (diagnosisId: number) => {
    if (processingIds.has(diagnosisId)) return;
    setProcessingIds((prev) => new Set(prev).add(diagnosisId));
    executeApprove({ diagnosisId });
    // Clear processing after a delay if not reloaded
    setTimeout(() => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(diagnosisId);
        return next;
      });
    }, 5000);
  };

  const handleReject = (diagnosisId: number) => {
    setSelectedDiagnosisId(diagnosisId);
    setRejectModalOpen(true);
  };

  const confirmReject = () => {
    if (selectedDiagnosisId === null) return;
    setProcessingIds((prev) => new Set(prev).add(selectedDiagnosisId));
    setRejectModalOpen(false);
    executeReject({
      diagnosisId: selectedDiagnosisId,
      reason: rejectReason,
    });
    // Clear processing after a delay if not reloaded
    setTimeout(() => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedDiagnosisId);
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
      onApprove: handleApprove,
      onReject: handleReject,
      openDiagnosisModal: (row: TData) => {
        setSelectedDiagnosis(row);
        setDetailsModalOpen(true);
      },
    },
  });

  const pageSizeOptions = useMemo(() => [10, 25, 50, 100], []);

  const uniqueDiseases = useMemo(() => {
    const diseases = new Set<string>();
    (data as PendingDiagnosisRow[]).forEach((item) => {
      if (item.disease) diseases.add(item.disease);
    });
    return Array.from(diseases).sort();
  }, [data]);

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
          {/* Top row: search */}
          <div className="flex w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/60 z-10 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search pending diagnoses..."
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

          {/* Controls row */}
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              {/* Sort */}
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

              {/* Disease filter */}
              <Select
                value={selectedDisease}
                onValueChange={(value) => {
                  setSelectedDisease(value === "__all__" ? "" : value);
                  table.setPageIndex(0);
                }}
                className="w-auto"
              >
                <SelectTrigger className="w-44 shrink-0 h-10 text-sm">
                  <SelectValue placeholder="All Diseases" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Diseases</SelectItem>
                  {uniqueDiseases.map((disease) => (
                    <SelectItem key={disease} value={disease}>
                      {disease}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date From */}
              <DatePicker
                value={dateFrom}
                onChange={(date) => {
                  setDateFrom(date);
                  table.setPageIndex(0);
                }}
                placeholder="Date From"
                className="w-[150px] shrink-0 h-10"
              />

              {/* Date To */}
              <DatePicker
                value={dateTo}
                onChange={(date) => {
                  setDateTo(date);
                  table.setPageIndex(0);
                }}
                placeholder="Date To"
                className="w-[150px] shrink-0 h-10"
              />

              {/* Clear filters button */}
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

        {/* Data Table */}
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
                    const diagnosis = row.original as PendingDiagnosisRow;
                    const isProcessing = processingIds.has(diagnosis.id);
                    
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-base-200/50 transition-colors"
                      >
                        {row.getVisibleCells().map((cell) => {
                          // Check if this is the actions cell and we're processing this row
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
                        ? "No pending diagnoses match your filters."
                        : "No pending diagnoses."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
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

      {/* Reject Confirmation Modal */}
      {isMounted && createPortal(
        <dialog className={`modal ${rejectModalOpen ? "modal-open" : ""}`}>
          <div className="modal-box">
            <h3 className="font-bold text-lg">Reject Diagnosis</h3>
            <p className="py-4">
              Are you sure you want to reject this diagnosis? This action cannot be undone.
            </p>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Reason (optional)</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                placeholder="Enter a reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setRejectModalOpen(false);
                  setSelectedDiagnosisId(null);
                  setRejectReason("");
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={confirmReject}
              >
                Reject
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => {
            setRejectModalOpen(false);
            setSelectedDiagnosisId(null);
            setRejectReason("");
          }} />
        </dialog>,
        document.body
      )}

      {/* Details Modal */}
      {isMounted && createPortal(
        <dialog className={`modal ${detailsModalOpen ? "modal-open" : ""}`}>
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Diagnosis Details</h3>
            {selectedDiagnosis && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-base-content/60">Condition</p>
                    <p className="font-medium">{(selectedDiagnosis as any).disease}</p>
                  </div>
                  <div>
                    <p className="text-sm text-base-content/60">Patient ID</p>
                    <p className="font-medium">{(selectedDiagnosis as any).patientId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-base-content/60">Location</p>
                    <p className="font-medium">{(selectedDiagnosis as any).district || (selectedDiagnosis as any).barangay || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-base-content/60">Submitted</p>
                    <p className="font-medium">{new Date((selectedDiagnosis as any).submittedAt).toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Symptoms</p>
                  <p className="text-sm mt-1 p-3 bg-base-200 rounded-lg">{(selectedDiagnosis as any).symptoms}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-base-content/60">Confidence:</p>
                  <span className={`badge ${(selectedDiagnosis as any).reliability.badgeClass} badge-sm`}>
                    {(selectedDiagnosis as any).reliability.label}
                  </span>
                </div>
              </div>
            )}
            <div className="modal-action">
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (selectedDiagnosis) {
                    handleApprove((selectedDiagnosis as any).id);
                  }
                  setDetailsModalOpen(false);
                  setSelectedDiagnosis(null);
                }}
              >
                Approve
              </button>
              <button
                className="btn btn-outline btn-error"
                onClick={() => {
                  if (selectedDiagnosis) {
                    handleReject((selectedDiagnosis as any).id);
                  }
                  setDetailsModalOpen(false);
                  setSelectedDiagnosis(null);
                }}
              >
                Reject
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setDetailsModalOpen(false);
                  setSelectedDiagnosis(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => {
            setDetailsModalOpen(false);
            setSelectedDiagnosis(null);
          }} />
        </dialog>,
        document.body
      )}
    </>
  );
}
