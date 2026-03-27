"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { exportToPDF, PdfColumn } from "@/utils/pdf-export";
import {
  buildReportFilename,
  exportToCSV,
  exportToJSON,
  exportToExcel,
  type ReportColumn,
  type ReportFormat,
} from "@/utils/report-export";
import { format } from "date-fns";
import { ExportReportModal } from "./export-report-modal";

interface ExportReportButtonProps {
  data: Record<string, unknown>[];
  columns: PdfColumn[] | ReportColumn[];
  filenameSlug: string;
  title: string;
  subtitle?: string;
  generatedBy?: { name: string; email?: string };
  disabled?: boolean;
}

export function ExportReportButton({
  data,
  columns,
  filenameSlug,
  title,
  subtitle,
  generatedBy,
  disabled = false,
}: ExportReportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleGenerate = (exportFormat: ReportFormat) => {
    const filename = buildReportFilename(filenameSlug, exportFormat);

    switch (exportFormat) {
      case "pdf":
        exportToPDF({
          title,
          subtitle,
          generatedBy,
          data,
          columns,
          filename,
        });
        break;
      case "csv":
        exportToCSV(data, columns, filename);
        break;
      case "json": {
        const metadata = {
          generatedBy,
          generatedOn: format(new Date(), "MMMM d, yyyy 'at' h:mm a"),
        };
        exportToJSON(data, filename, metadata);
        break;
      }
      case "xlsx":
        exportToExcel(data, columns, filename);
        break;
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={disabled || data.length === 0}
        className="btn border-border gap-2 h-10"
        type="button"
      >
        <FileDown className="h-4 w-4" />
        Export Report
      </button>
      <ExportReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGenerate={handleGenerate}
        title={title}
        filenameSlug={filenameSlug}
        disabled={disabled || data.length === 0}
      />
    </>
  );
}
