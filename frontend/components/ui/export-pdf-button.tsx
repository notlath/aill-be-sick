"use client";

import { FileDown } from "lucide-react";
import { exportToPDF, PdfColumn } from "@/utils/pdf-export";

interface ExportButtonProps {
  data: Record<string, unknown>[];
  columns: PdfColumn[];
  filename: string;
  title: string;
  subtitle?: string;
  disabled?: boolean;
}

export function ExportPdfButton({
  data,
  columns,
  filename,
  title,
  subtitle,
  disabled = false,
}: ExportButtonProps) {
  const handleExport = () => {
    exportToPDF({
      title,
      subtitle,
      data,
      columns,
      filename,
    });
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      className="btn btn-outline border-border gap-2"
      type="button"
    >
      <FileDown className="h-4 w-4" />
      Export PDF
    </button>
  );
}
