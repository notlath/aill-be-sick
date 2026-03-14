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
import { DiagnosisRow } from "./columns"; // For type casting

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
  { value: "confidence", label: "Confidence (Low-High)", desc: false },
  { value: "confidence", label: "Confidence (High-Low)", desc: true },
  { value: "uncertainty", label: "Uncertainty (Low-High)", desc: false },
  { value: "uncertainty", label: "Uncertainty (High-Low)", desc: true },
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
    meta: {
      openDiagnosisModal: (row: any) => {
        setSelectedDiagnosis(row);
        (document.getElementById("diagnosis_modal") as HTMLDialogElement)?.showModal();
      },
      openPatientModal: (user: any) => {
        setSelectedPatient(user);
        (document.getElementById("patient_modal") as HTMLDialogElement)?.showModal();
      },
    },
  });

  const pageSizeOptions = useMemo(() => [10, 25, 50, 100], []);

  const uniqueDiseases = useMemo(() => {
    const diseases = new Set<string>();
    // @ts-ignore - Assuming TData has an accessor "disease"
    data.forEach((item) => {
      if ((item as any).disease) {
        diseases.add((item as any).disease);
      }
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

  return (
    <>
      <div className="space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72 mt-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/60 z-10 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search reports..."
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
            {additionalActions}
            
            <Select
              className="w-auto"
              value={currentSortLabel}
              onValueChange={handleSortChange}
            >
              <SelectTrigger className="w-[180px]">
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

            <Select
              className="w-auto"
              value={(table.getColumn("disease")?.getFilterValue() as string) ?? ""}
              onValueChange={(value) => {
                table.getColumn("disease")?.setFilterValue(value || undefined);
                table.setPageIndex(0);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Diseases" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Diseases</SelectItem>
                {uniqueDiseases.map((disease) => (
                  <SelectItem key={disease} value={disease}>
                    {disease}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-sm text-base-content/60">Rows per page:</span>
            <Select
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
      {/* Details Modal */}
      <dialog
        id="diagnosis_modal"
        className="modal"
      >
        <div className="modal-box w-11/12 max-w-2xl bg-base-100">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4">
              ✕
            </button>
          </form>
          <h3 className="font-bold text-2xl mb-6">Diagnosis Details</h3>

          {selectedDiagnosis && (() => {
            const diagnosisRow = selectedDiagnosis as unknown as DiagnosisRow;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-base-200/50 p-4 rounded-lg">
                    <p className="text-sm text-base-content/60 mb-1">Disease</p>
                    <p className="font-medium">{diagnosisRow.disease}</p>
                  </div>
                  <div className="bg-base-200/50 p-4 rounded-lg">
                    <p className="text-sm text-base-content/60 mb-1">Patient ID</p>
                    <p className="font-medium">{diagnosisRow.userId}</p>
                  </div>
                  <div className="bg-base-200/50 p-4 rounded-lg">
                    <p className="text-sm text-base-content/60 mb-1">Confidence</p>
                    <p className="font-medium">{(diagnosisRow.confidence * 100).toFixed(4)}%</p>
                  </div>
                  <div className="bg-base-200/50 p-4 rounded-lg">
                    <p className="text-sm text-base-content/60 mb-1">Uncertainty</p>
                    <p className="font-medium">{diagnosisRow.uncertainty.toFixed(4)}%</p>
                  </div>
                </div>

                <div className="bg-base-200/50 p-4 rounded-lg">
                  <p className="text-sm text-base-content/60 mb-2">Reported Symptoms</p>
                  <p className="text-sm leading-relaxed">{diagnosisRow.symptoms}</p>
                </div>

                <div className="bg-base-200/50 p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="text-sm text-base-content/60 mb-1">Date Created</p>
                    <p className="font-medium">{new Date(diagnosisRow.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Patient Details Modal */}
      <dialog
        id="patient_modal"
        className="modal"
      >
        <div className="modal-box w-11/12 max-w-2xl bg-base-100">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4">
              ✕
            </button>
          </form>
          <h3 className="font-bold text-2xl mb-6">Patient Details</h3>

          {selectedPatient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-base-200/50 p-4 rounded-lg">
                  <p className="text-sm text-base-content/60 mb-1">Name</p>
                  <p className="font-medium">{selectedPatient.name || "N/A"}</p>
                </div>
                <div className="bg-base-200/50 p-4 rounded-lg">
                  <p className="text-sm text-base-content/60 mb-1">Email</p>
                  <p className="font-medium">{selectedPatient.email || "N/A"}</p>
                </div>
                <div className="bg-base-200/50 p-4 rounded-lg">
                  <p className="text-sm text-base-content/60 mb-1">Age</p>
                  <p className="font-medium">{selectedPatient.age || "N/A"}</p>
                </div>
                <div className="bg-base-200/50 p-4 rounded-lg">
                  <p className="text-sm text-base-content/60 mb-1">Gender</p>
                  <p className="font-medium">
                    {selectedPatient.gender
                      ? selectedPatient.gender.charAt(0).toUpperCase() + selectedPatient.gender.slice(1).toLowerCase()
                      : "N/A"}
                  </p>
                </div>
                <div className="bg-base-200/50 p-4 rounded-lg">
                  <p className="text-sm text-base-content/60 mb-1">Role</p>
                  <p className="font-medium">
                    {selectedPatient.role
                      ? selectedPatient.role.charAt(0).toUpperCase() + selectedPatient.role.slice(1).toLowerCase()
                      : "N/A"}
                  </p>
                </div>
                <div className="bg-base-200/50 p-4 rounded-lg">
                  <p className="text-sm text-base-content/60 mb-1">Location</p>
                  <p className="font-medium">
                    {selectedPatient.city || selectedPatient.province
                      ? [selectedPatient.city, selectedPatient.province].filter(Boolean).join(", ")
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
}
