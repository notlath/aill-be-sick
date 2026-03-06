"use client";

import React, { useState, useEffect, useRef } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

interface DiagnosisDateFilterProps {
  onDateRangeChange: (startDate: Date | null, endDate: Date | null) => void;
  loading?: boolean;
}

type PresetType =
  | "this-month"
  | "last-month"
  | "last-7-days"
  | "last-3-months"
  | "last-6-months"
  | "year-to-date"
  | "custom";

interface DatePickerProps {
  selectedDate: Date | null;
  onDateChange: (date: Date) => void;
  label: string;
  disabled?: boolean;
}

const buildMonthOptions = (count: number) => {
  const options: Array<{ value: string; label: string; date: Date }> = [];
  const now = new Date();

  for (let offset = 0; offset < count; offset += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    options.push({
      value: `${year}-${month}`,
      label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      date: d,
    });
  }

  return options;
};

const getDatePresetRange = (preset: PresetType): [Date, Date] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "this-month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = today;
      return [start, end];
    }

    case "last-month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return [start, end];
    }

    case "last-7-days": {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      return [start, today];
    }

    case "last-3-months": {
      const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const end = today;
      return [start, end];
    }

    case "last-6-months": {
      const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const end = today;
      return [start, end];
    }

    case "year-to-date": {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = today;
      return [start, end];
    }

    case "custom":
      return [null as any, null as any];

    default:
      return [null as any, null as any];
  }
};

const MonthYearPicker: React.FC<DatePickerProps> = ({
  selectedDate,
  onDateChange,
  label,
  disabled,
}) => {
  const [activeYear, setActiveYear] = useState<number>(
    selectedDate?.getFullYear() ?? new Date().getFullYear(),
  );
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const monthOptions = React.useMemo(() => buildMonthOptions(24), []);

  const availableYears = React.useMemo(() => {
    const years = new Set<number>();
    monthOptions.forEach((option) => years.add(option.date.getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [monthOptions]);

  const activeYearMonths = React.useMemo(() => {
    return monthOptions
      .filter((option) => option.date.getFullYear() === activeYear)
      .sort((a, b) => b.date.getMonth() - a.date.getMonth());
  }, [monthOptions, activeYear]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const formatTriggerLabel = () => {
    if (!selectedDate) return "Select month";
    return selectedDate.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="relative w-[260px]" ref={ref}>
      <button
        type="button"
        className="flex h-8 w-full items-center justify-between gap-2 rounded-[10px] border border-success/40 bg-white/50 px-4 py-2.5 text-xs text-base-content transition-all duration-200 hover:border-base-300/70 hover:bg-white/70 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:outline-none disabled:opacity-50"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate text-left">{formatTriggerLabel()}</span>
        <CalendarDays className="size-4 shrink-0" />
      </button>

      {isOpen && (
        <div className="bg-base-100 border-base-300 absolute left-0 z-40 mt-2 w-full rounded-[12px] border p-3 shadow-lg">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase text-base-content/70">
                Year
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {availableYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  className={`btn btn-sm ${activeYear === year ? "btn-success" : "btn-ghost"}`}
                  onClick={() => setActiveYear(year)}
                >
                  {year}
                </button>
              ))}
            </div>

            <div className="border-base-300 border-t pt-3">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {activeYearMonths.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`btn btn-sm ${
                      selectedDate?.toISOString().substring(0, 7) ===
                      option.value
                        ? "btn-success"
                        : "btn-ghost"
                    }`}
                    onClick={() => {
                      // Set to first day of the month
                      onDateChange(
                        new Date(
                          option.date.getFullYear(),
                          option.date.getMonth(),
                          1,
                        ),
                      );
                      setIsOpen(false);
                    }}
                  >
                    {option.label.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const DiagnosisDateFilter: React.FC<DiagnosisDateFilterProps> = ({
  onDateRangeChange,
  loading,
}) => {
  const [activePreset, setActivePreset] = useState<PresetType>("this-month");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Initialize with "This month" preset
  useEffect(() => {
    const [start, end] = getDatePresetRange("this-month");
    setStartDate(start);
    setEndDate(end);
    onDateRangeChange(start, end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePresetClick = (preset: PresetType) => {
    setActivePreset(preset);

    if (preset === "custom") {
      // For custom, keep current dates or initialize to current month
      if (!startDate || !endDate) {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(monthStart);
        setEndDate(today);
        onDateRangeChange(monthStart, today);
      }
    } else {
      const [start, end] = getDatePresetRange(preset);
      setStartDate(start);
      setEndDate(end);
      onDateRangeChange(start, end);
    }
  };

  const handleCustomDateChange = (type: "start" | "end", date: Date) => {
    if (type === "start") {
      setStartDate(date);
      onDateRangeChange(date, endDate);
    } else {
      setEndDate(date);
      onDateRangeChange(startDate, date);
    }
  };

  const presets: Array<{ id: PresetType; label: string }> = [
    { id: "this-month", label: "This month" },
    { id: "last-month", label: "Last month" },
    { id: "last-7-days", label: "Last 7 days" },
    { id: "last-3-months", label: "Last 3 months" },
    { id: "last-6-months", label: "Last 6 months" },
    { id: "year-to-date", label: "Year to date" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`btn btn-sm font-normal ${
              activePreset === preset.id ? "btn-success btn-soft" : "btn-ghost"
            }`}
            disabled={loading}
            onClick={() => handlePresetClick(preset.id)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom date range pickers */}
      {activePreset === "custom" && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">From:</span>
            <MonthYearPicker
              selectedDate={startDate}
              onDateChange={(date) => handleCustomDateChange("start", date)}
              label="Start month"
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">To:</span>
            <MonthYearPicker
              selectedDate={endDate}
              onDateChange={(date) => handleCustomDateChange("end", date)}
              label="End month"
              disabled={loading}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagnosisDateFilter;
