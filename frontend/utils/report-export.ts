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
  generatedBy?: { name: string; email?: string };
}

export type ReportFormat = "pdf" | "csv" | "json" | "xlsx";

export type SurveillanceTab = "by-disease" | "by-cluster" | "by-anomaly";

export interface SurveillanceExportData {
  tab: SurveillanceTab;
  disease?: string;
  view?: "district" | "coordinates";
  dateRange?: { start: string; end: string };
  stats?: Record<string, unknown>;
  mapData?: Record<string, unknown>[];
  timelineData?: Record<string, unknown>[];
  additionalData?: Record<string, unknown>;
}

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
  metadata?: { generatedBy?: { name: string; email?: string }; generatedOn: string }
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

function getSurveillanceColumns(tab: SurveillanceTab, dataType: string): ReportColumn[] {
  switch (tab) {
    case "by-disease":
      if (dataType === "stats") {
        return [
          { header: "Metric", dataKey: "metric" },
          { header: "Value", dataKey: "value" },
        ];
      }
      if (dataType === "map") {
        return [
          { header: "District", dataKey: "district" },
          { header: "Cases", dataKey: "cases" },
        ];
      }
      if (dataType === "diagnoses") {
        return [
          { header: "ID", dataKey: "id" },
          { header: "Disease", dataKey: "disease" },
          { header: "District", dataKey: "district" },
          { header: "Latitude", dataKey: "latitude" },
          { header: "Longitude", dataKey: "longitude" },
          { header: "Created At", dataKey: "createdAt" },
          { header: "Confidence", dataKey: "confidence" },
          { header: "Uncertainty", dataKey: "uncertainty" },
        ];
      }
      if (dataType === "timeline") {
        return [
          { header: "Date", dataKey: "date" },
          { header: "Cases", dataKey: "cases" },
        ];
      }
      break;
    case "by-cluster":
      if (dataType === "stats") {
        return [
          { header: "Metric", dataKey: "metric" },
          { header: "Value", dataKey: "value" },
        ];
      }
      if (dataType === "illnesses") {
        return [
          { header: "ID", dataKey: "id" },
          { header: "Disease", dataKey: "disease" },
          { header: "District", dataKey: "district" },
          { header: "Latitude", dataKey: "latitude" },
          { header: "Longitude", dataKey: "longitude" },
          { header: "Created At", dataKey: "createdAt" },
          { header: "Cluster", dataKey: "cluster" },
        ];
      }
      break;
    case "by-anomaly":
      if (dataType === "stats") {
        return [
          { header: "Metric", dataKey: "metric" },
          { header: "Value", dataKey: "value" },
        ];
      }
      if (dataType === "anomalies") {
        return [
          { header: "ID", dataKey: "id" },
          { header: "Disease", dataKey: "disease" },
          { header: "District", dataKey: "district" },
          { header: "Latitude", dataKey: "latitude" },
          { header: "Longitude", dataKey: "longitude" },
          { header: "Created At", dataKey: "createdAt" },
          { header: "Anomaly Score", dataKey: "anomaly_score" },
        ];
      }
      if (dataType === "normal") {
        return [
          { header: "ID", dataKey: "id" },
          { header: "Disease", dataKey: "disease" },
          { header: "District", dataKey: "district" },
          { header: "Latitude", dataKey: "latitude" },
          { header: "Longitude", dataKey: "longitude" },
          { header: "Created At", dataKey: "createdAt" },
        ];
      }
      break;
  }
  return [];
}

// Simplified for tabular export
export async function exportSurveillanceData(
  data: Record<string, unknown>[],
  columns: ReportColumn[],
  filenameSlug: string,
  title: string,
  subtitle: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const filename = buildReportFilename(filenameSlug, "csv"); // For now, only CSV
  exportToCSV(data, columns, filename);
}

// For modal export
export function getSurveillanceExportData(
  exportData: SurveillanceExportData
): {
  data: Record<string, unknown>[];
  columns: ReportColumn[];
  filenameSlug: string;
  title: string;
  subtitle: string;
  metadata?: Record<string, unknown>;
} {
  const { tab, disease, view, dateRange, stats, mapData, timelineData, additionalData } = exportData;

  let data: Record<string, unknown>[] = [];
  let columns: ReportColumn[] = [];
  let dataType = "";

  const slug = `surveillance-${tab}-${disease || "all"}-${view || "district"}`;
  const title = `Surveillance ${tab.replace("by-", "").replace("-", " ")} Data`;
  const subtitle = `Disease: ${disease || "All"}, View: ${view || "District"}, Dates: ${dateRange?.start || "N/A"} to ${dateRange?.end || "N/A"}`;

  const metadata = {
    tab,
    disease: disease || "all",
    view: view || "district",
    dateRange,
    stats,
    exportedAt: new Date().toISOString(),
  };

  // Choose main data
  if (tab === "by-disease") {
    if (view === "district" && mapData) {
      data = mapData;
      dataType = "map";
    } else if (mapData) {
      data = mapData;
      dataType = "diagnoses";
    }
  } else if (tab === "by-cluster") {
    if (mapData) {
      data = mapData;
      dataType = "illnesses";
    }
  } else if (tab === "by-anomaly") {
    if (additionalData?.anomalies) {
      data = additionalData.anomalies as Record<string, unknown>[];
      dataType = "anomalies";
    } else if (additionalData?.normal) {
      data = additionalData.normal as Record<string, unknown>[];
      dataType = "normal";
    }
  }

  if (dataType) {
    columns = getSurveillanceColumns(tab, dataType);
  }

  return { data, columns, filenameSlug: slug, title, subtitle, metadata };
}
