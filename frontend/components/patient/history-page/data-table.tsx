"use client";

import { getClinicalVerificationStatusMeta } from "@/utils/clinical-verification";
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
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  additionalActions?: React.ReactNode;
}

type SortOption = {
  value: string;
  label: string;
  desc: boolean;
};

const sortOptions: SortOption[] = [
  { value: "createdAt", label: "Date (Newest)", desc: true },
  { value: "createdAt", label: "Date (Oldest)", desc: false },
  { value: "diagnosis", label: "Condition (A-Z)", desc: false },
  { value: "diagnosis", label: "Condition (Z-A)", desc: true },
  { value: "diagnosisStatus", label: "Status (A-Z)", desc: false },
  { value: "diagnosisStatus", label: "Status (Z-A)", desc: true },
  { value: "reliabilityRank", label: "Reliability (High-Low)", desc: true },
  { value: "reliabilityRank", label: "Reliability (Low-High)", desc: false },
];

export function DataTable<TData, TValue>({
  columns,
  data,
  additionalActions,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

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
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
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

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 z-10 -translate-y-1/2 text-muted" />
          <Input
            type="text"
            placeholder="Search assessment history..."
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

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <Select className="w-auto" value={currentSortLabel} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.label} value={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select className="w-auto"
            value={(table.getColumn("diagnosis")?.getFilterValue() as string) ?? ""}
            onValueChange={(value) => {
              table.getColumn("diagnosis")?.setFilterValue(value || undefined);
              table.setPageIndex(0);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="All Diseases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Diseases</SelectItem>
              {/* Diseases derived from Prisma schema */}
              <SelectItem value="Dengue">Dengue</SelectItem>
              <SelectItem value="Pneumonia">Pneumonia</SelectItem>
              <SelectItem value="Typhoid">Typhoid</SelectItem>
              <SelectItem value="Diarrhea">Diarrhea</SelectItem>
              <SelectItem value="Measles">Measles</SelectItem>
              <SelectItem value="Influenza">Influenza</SelectItem>
            </SelectContent>
          </Select>

          {additionalActions && <div key="additional-actions">{additionalActions}</div>}
        </div>
      </div>

      {/* ===== Mobile Card View (below lg) ===== */}
      <div className="lg:hidden space-y-3">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            const original = row.original as any;
            const diagnosis = original.diagnosis as string;
            const diagnosisStatus = original.diagnosisStatus as string | null;
            const reliabilityLabel = original.reliabilityLabel as string | null;
            const reliabilityBadgeClass = original.reliabilityBadgeClass as string | null;
            const clinicalVerificationStatus = original.clinicalVerificationStatus as
              | string
              | null;
            const createdAt = original.createdAt as Date;

            const statusBadge = diagnosisStatus ? getStatusBadge(diagnosisStatus) : null;
            const clinicalVerificationBadge = clinicalVerificationStatus
              ? getClinicalVerificationStatusMeta(clinicalVerificationStatus)
              : null;

            return (
              <div
                key={row.id}
                className="bg-base-100 border border-border/60 rounded-2xl p-4 space-y-3 transition-colors active:bg-base-200/50"
              >
                {/* Top row: Diagnosis + Model */}
                <div className="flex flex-col xs:flex-row xs:items-start xs:justify-between gap-1.5 xs:gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-base-content text-base leading-snug truncate">
                      {diagnosis}
                    </p>
                    <p className="text-muted text-xs mt-0.5">
                      {createdAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      ·{" "}
                      {createdAt.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center flex-wrap gap-2">
                    {statusBadge && (
                      <span className={`badge badge-sm shrink-0 w-fit ${statusBadge.badgeClass}`}>
                        {statusBadge.label}
                      </span>
                    )}
                    {reliabilityLabel && reliabilityBadgeClass && (
                      <span className={`badge badge-sm shrink-0 w-fit ${reliabilityBadgeClass}`}>
                        {reliabilityLabel}
                      </span>
                    )}
                    {clinicalVerificationBadge && (
                      <span
                        className={`badge badge-sm shrink-0 w-fit ${clinicalVerificationBadge.badgeClass}`}
                      >
                        {clinicalVerificationBadge.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex justify-end pt-1">
                  {row.getVisibleCells().map((cell) => {
                    if (cell.column.id === "actions") {
                      return (
                        <div key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-muted">
            {globalFilter || columnFilters.length > 0
              ? "No results match your filters."
              : "No results."}
          </div>
        )}
      </div>

      {/* ===== Desktop Table View (lg and above) ===== */}
      <div className="hidden lg:block bg-base-100 border border-border rounded-xl mx-auto overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="table bg-base-200 w-full whitespace-nowrap lg:whitespace-normal">
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
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-base-200/50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="first:pl-6 last:pr-6">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center">
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

      {/* Pagination Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-2">
        <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto whitespace-nowrap">
          <span className="text-sm text-muted">Rows per page:</span>
          <Select className="!w-auto"
            value={String(pagination.pageSize)}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
              table.setPageIndex(0);
            }}
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

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-sm text-muted text-center sm:text-left">
            {table.getFilteredRowModel().rows.length > 0
              ? `${pagination.pageIndex * pagination.pageSize + 1} - ${Math.min(
                (pagination.pageIndex + 1) * pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )} of ${table.getFilteredRowModel().rows.length}`
              : "0 of 0"}
          </span>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              className="btn btn-sm hidden sm:inline-flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              First
            </button>
            <button
              className="btn btn-sm w-full sm:w-auto"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </button>
            <button
              className="btn btn-sm w-full sm:w-auto"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </button>
            <button
              className="btn btn-sm hidden sm:inline-flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              Last
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return {
        label: "Pending Review",
        badgeClass: "badge-warning",
      };
    case "VERIFIED":
      return {
        label: "Verified",
        badgeClass: "badge-success",
      };
    case "REJECTED":
      return {
        label: "Reviewed",
        badgeClass: "badge-error",
      };
    case "INCONCLUSIVE":
      return {
        label: "Pending Review",
        badgeClass: "badge-warning",
      };
    default:
      return {
        label: status,
        badgeClass: "badge-ghost",
      };
  }
}
