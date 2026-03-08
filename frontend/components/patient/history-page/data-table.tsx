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
}

type SortOption = {
  value: string;
  label: string;
  desc: boolean;
};

const sortOptions: SortOption[] = [
  { value: "createdAt", label: "Date (Newest)", desc: true },
  { value: "createdAt", label: "Date (Oldest)", desc: false },
  { value: "diagnosis", label: "Diagnosis (A-Z)", desc: false },
  { value: "diagnosis", label: "Diagnosis (Z-A)", desc: true },
  { value: "uncertainty", label: "Uncertainty (High-Low)", desc: true },
  { value: "uncertainty", label: "Uncertainty (Low-High)", desc: false },
  { value: "confidence", label: "Confidence (High-Low)", desc: true },
  { value: "confidence", label: "Confidence (Low-High)", desc: false },
];

export function DataTable<TData, TValue>({
  columns,
  data,
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            type="text"
            placeholder="Search diagnosis history..."
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
              <SelectItem value="Impetigo">Impetigo</SelectItem>
              <SelectItem value="Diarrhea">Diarrhea</SelectItem>
              <SelectItem value="Measles">Measles</SelectItem>
              <SelectItem value="Influenza">Influenza</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ===== Mobile Card View (below lg) ===== */}
      <div className="lg:hidden space-y-3">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            const original = row.original as any;
            const diagnosis = original.diagnosis as string;
            const uncertainty = original.uncertainty as number | null;
            const confidence = original.confidence as number | null;
            const modelUsed = original.modelUsed as string | null;
            const createdAt = original.createdAt as Date;

            return (
              <div
                key={row.id}
                className="bg-base-100 border border-border/60 rounded-2xl p-4 space-y-3 transition-colors active:bg-base-200/50"
              >
                {/* Top row: Diagnosis + Date */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
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
                  {modelUsed && (
                    <span className="badge badge-sm badge-ghost shrink-0 mt-0.5">
                      {modelUsed}
                    </span>
                  )}
                </div>

                {/* Stats row */}
                {(confidence !== null || uncertainty !== null) && (
                  <div className="flex gap-3">
                    {confidence !== null && (
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted">Confidence</span>
                          <span className="text-xs font-medium text-base-content">
                            {(confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-base-300 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-success rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(confidence * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {uncertainty !== null && (
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted">Uncertainty</span>
                          <span className="text-xs font-medium text-base-content">
                            {(uncertainty * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-base-300 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-warning rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(uncertainty * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
