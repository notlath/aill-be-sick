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
import { DatePicker } from "@/components/ui/date-picker";
import { DiagnosisRow } from "./columns";
import { PatientDetailModal } from "./patient-detail-modal";
import { ReportDetailModal } from "./report-detail-modal";

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
  { value: "disease", label: "Disease (A-Z)", desc: false },
  { value: "disease", label: "Disease (Z-A)", desc: true },
  { value: "createdAt", label: "Date (Oldest)", desc: false },
  { value: "createdAt", label: "Date (Newest)", desc: true },
];

export function DataTable<TData, TValue>({
  columns,
  data,
  additionalActions,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [selectedDiagnosis, setSelectedDiagnosis] = useState<TData | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Extra client-side filters not handled by tanstack (date range, district)
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedDisease, setSelectedDisease] = useState("");

  // Apply all client-side filters manually
  const filteredData = useMemo(() => {
    let rows = data as DiagnosisRow[];

    if (selectedDisease) {
      rows = rows.filter((r) => r.disease === selectedDisease);
    }

    if (selectedDistrict) {
      rows = rows.filter((r) => r.district === selectedDistrict);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      rows = rows.filter((r) => new Date(r.createdAt) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      // Include the full "to" day
      to.setHours(23, 59, 59, 999);
      rows = rows.filter((r) => new Date(r.createdAt) <= to);
    }

    return rows as TData[];
  }, [data, selectedDisease, selectedDistrict, dateFrom, dateTo]);

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
      openDiagnosisModal: (row: any) => {
        setSelectedDiagnosis(row);
        setIsReportModalOpen(true);
      },
      openPatientModal: (user: any) => {
        setSelectedPatient(user);
        setIsPatientModalOpen(true);
      },
    },
  });

  const pageSizeOptions = useMemo(() => [10, 25, 50, 100], []);

  const uniqueDiseases = useMemo(() => {
    const diseases = new Set<string>();
    (data as DiagnosisRow[]).forEach((item) => {
      if (item.disease) diseases.add(item.disease);
    });
    return Array.from(diseases).sort();
  }, [data]);

  const uniqueDistricts = useMemo(() => {
    const districts = new Set<string>();
    (data as DiagnosisRow[]).forEach((item) => {
      if (item.district) districts.add(item.district);
    });
    return Array.from(districts).sort();
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
    globalFilter || selectedDisease || selectedDistrict || dateFrom || dateTo;

  const clearAllFilters = () => {
    setGlobalFilter("");
    setSelectedDisease("");
    setSelectedDistrict("");
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
                placeholder="Search reports..."
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

            {/* District filter */}
            <Select
              value={selectedDistrict}
              onValueChange={(value) => {
                setSelectedDistrict(value === "__all__" ? "" : value);
                table.setPageIndex(0);
              }}
              className="w-auto"
            >
              <SelectTrigger className="w-44 shrink-0 h-10 text-sm">
                <SelectValue placeholder="All Districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Districts</SelectItem>
                {uniqueDistricts.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
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

            {/* Export PDF / Additional Actions - justified to the end */}
            <div className="shrink-0 flex items-center h-10">
              {additionalActions}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-base-100 border border-border rounded-xl mx-auto overflow-hidden">
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
                    <tr
                      key={row.id}
                      className="hover:bg-base-200/50 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="first:pl-6 last:pr-6 py-4">
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
                      {hasActiveFilters
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

      {isMounted && selectedDiagnosis ? createPortal(
        <ReportDetailModal
          isOpen={isReportModalOpen}
          onClose={() => {
            setIsReportModalOpen(false);
            setTimeout(() => setSelectedDiagnosis(null), 300);
          }}
          report={selectedDiagnosis as unknown as DiagnosisRow}
        />,
        document.body
      ) : null}

      {isMounted && selectedPatient ? createPortal(
        <PatientDetailModal
          isOpen={isPatientModalOpen}
          onClose={() => {
            setIsPatientModalOpen(false);
            setTimeout(() => setSelectedPatient(null), 300);
          }}
          patient={selectedPatient}
        />,
        document.body
      ) : null}
    </>
  );
}
