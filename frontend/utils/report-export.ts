"use client";

import { format } from "date-fns";
import * as XLSX from "xlsx";

export interface ReportColumn {
  header: string;
  dataKey: string;
  width?: number;
}

export interface ReportExportOptions {
  data: Record<string, unknown>[];
  columns: ReportColumn[];
  filenameSlug: string;
  title: string;
  subtitle?: string;
  generatedBy?: { name: string; email?: string | null };
}

export type ReportFormat = "pdf" | "csv" | "json" | "xlsx";

export function buildReportFilename(slug: string, ext: string): string {
  const now = new Date();
  const date = format(now, "yyyy-MM-dd");
  const time = format(now, "HHmmss");
  return `${slug}-${date}-${time}.${ext}`;
}

function formatCellValue(value: unknown, dataKey: string): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") {
    if (
      dataKey.toLowerCase().includes("confidence") ||
      dataKey.toLowerCase().includes("uncertainty")
    ) {
      return `${(value * 100).toFixed(1)}%`;
    }
    return value.toString();
  }
  if (value instanceof Date) {
    return format(value, "MMM d, yyyy");
  }
  if (typeof value === "object" && "toString" in value) {
    return value.toString();
  }
  return String(value);
}

function rowToValues(
  row: Record<string, unknown>,
  columns: ReportColumn[]
): string[] {
  return columns.map((col) => formatCellValue(row[col.dataKey], col.dataKey));
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCSV(
  data: Record<string, unknown>[],
  columns: ReportColumn[],
  filename: string
): void {
  const headers = columns.map((c) => c.header);
  const headerRow = headers.map(escapeCsvField).join(",");
  const dataRows = data.map((row) =>
    rowToValues(row, columns).map(escapeCsvField).join(",")
  );
  const csv = [headerRow, ...dataRows].join("\n");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToJSON(
  data: Record<string, unknown>[],
  filename: string,
  metadata?: { generatedBy?: { name: string; email?: string | null }; generatedOn: string }
): void {
  const payload = metadata
    ? { data, metadata }
    : { data };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ReportColumn[],
  filename: string
): void {
  // Note: SheetJS CE does not support cell styling (font, etc.). Excel will use default font.
  const headers = columns.map((c) => c.header);
  const rows = data.map((row) =>
    columns.map((col) => formatCellValue(row[col.dataKey], col.dataKey))
  );
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, filename);
}
