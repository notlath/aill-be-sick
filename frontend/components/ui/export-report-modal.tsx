"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReportColumn, ReportFormat } from "@/utils/report-export";

export const FORMAT_OPTIONS: { value: ReportFormat; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" },
  { value: "json", label: "JSON" },
  { value: "xlsx", label: "Excel" },
];

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (format: ReportFormat) => void;
  title: string;
  filenameSlug: string;
  disabled?: boolean;
  availableFormats?: { value: ReportFormat; label: string }[];
}

export function ExportReportModal({
  isOpen,
  onClose,
  onGenerate,
  title,
  filenameSlug,
  disabled = false,
  availableFormats = FORMAT_OPTIONS,
}: ExportReportModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>("pdf");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleGenerate = () => {
    onGenerate(selectedFormat);
    onClose();
  };

  if (!isMounted || !isOpen) return null;

  const modalContent = (
    <dialog
      ref={dialogRef}
      className="modal [&::backdrop]:bg-black"
      onCancel={onClose}
      onClick={onClose}
    >
      <div
        className="modal-box bg-base-100 overflow-visible"
        onClick={handleContentClick}
      >
        <h3 className="font-bold text-lg mb-2">Export Report</h3>
        <p className="text-sm text-base-content/70 mb-4">
          Choose a file format for your report. The file will be downloaded after generation.
        </p>

        <div className="form-control w-full mb-6 space-y-1">
          <label className="label text-sm">
            File format:
          </label>
          <Select
            value={selectedFormat}
            onValueChange={(v) => setSelectedFormat(v as ReportFormat)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              {availableFormats.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={disabled}
          >
            Generate
          </button>
        </div>
      </div>
    </dialog>
  );

  return createPortal(modalContent, document.body);
}
