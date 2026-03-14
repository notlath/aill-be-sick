"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export interface PdfColumn {
  header: string;
  dataKey: string;
  width?: number;
}

export interface PdfExportOptions {
  title: string;
  data: Record<string, unknown>[];
  columns: PdfColumn[];
  filename?: string;
  subtitle?: string;
}

const PRIMARY_COLOR: [number, number, number] = [59, 130, 246]; // oklch(59% 0.145 163.225) - matches --color-primary from globals.css
const TEXT_COLOR: [number, number, number] = [29, 29, 31]; // #1d1d1f - matches --color-base-content
const MUTED_COLOR: [number, number, number] = [134, 134, 139]; // #86868b - matches --color-muted

export function exportToPDF({
  title,
  data,
  columns,
  filename,
  subtitle,
}: PdfExportOptions) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const headerText = "AI'll Be Sick";
  doc.setFontSize(10);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(headerText, 14, 15);

  doc.setFontSize(20);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(title, 14, 28);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(subtitle, 14, 36);
  }

  doc.setFontSize(8);
  doc.setTextColor(...MUTED_COLOR);
  const generatedDate = format(new Date(), "MMMM d, yyyy 'at' h:mm a");
  doc.text(`Generated on ${generatedDate}`, 14, pageHeight - 10);

  const tableData = data.map((row) =>
    columns.map((col) => {
      const value = row[col.dataKey];
      if (value === null || value === undefined) return "-";
      if (typeof value === "number") {
        if (col.dataKey.toLowerCase().includes("confidence") || col.dataKey.toLowerCase().includes("uncertainty")) {
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
    })
  );

  autoTable(doc, {
    head: [columns.map((col) => col.header)],
    body: tableData,
    startY: subtitle ? 42 : 38,
    headStyles: {
      fillColor: PRIMARY_COLOR,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: "bold",
      halign: "left",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: TEXT_COLOR,
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 247],
    },
    columnStyles: columns.reduce((acc, col, idx) => {
      if (col.width) {
        acc[idx] = { cellWidth: col.width };
      }
      return acc;
    }, {} as Record<number, { cellWidth?: number }>),
    margin: { left: 14, right: 14 },
    theme: "striped",
    styles: {
      lineColor: [232, 232, 237],
      lineWidth: 0.1,
    },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0;
  
  doc.setFontSize(8);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(
    `Page 1 of ${doc.getNumberOfPages()}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  const safeFilename = filename || title.toLowerCase().replace(/\s+/g, "-");
  doc.save(`${safeFilename}.pdf`);
}
