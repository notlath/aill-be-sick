"use client";

import React, { useState, useEffect, useRef } from "react";
import { CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DiagnosisDateFilterProps {
  onDateRangeChange: (startDate: Date | null, endDate: Date | null) => void;
  loading?: boolean;
  currentStartDate?: Date | null;
  currentEndDate?: Date | null;
}

type PresetType = "all-time" | "last-7-days" | "last-3-months" | "year-to-date" | "custom";

interface DatePickerProps {
  selectedDate: Date | null;
  onDateChange: (date: Date) => void;
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

const getDatePresetRange = (preset: PresetType): [Date | null, Date | null] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "all-time":
      return [null, null];

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

    case "year-to-date": {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = today;
      return [start, end];
    }

    case "custom":
      return [null, null];

    default:
      return [null, null];
  }
};

const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const resolvePresetFromRange = (startDate: Date | null, endDate: Date | null): PresetType => {
  if (!startDate && !endDate) {
    return "all-time";
  }

  if (!startDate || !endDate) {
    return "custom";
  }

  const deterministicPresets: PresetType[] = [
    "last-7-days",
    "last-3-months",
    "year-to-date",
  ];

  for (const preset of deterministicPresets) {
    const [presetStart, presetEnd] = getDatePresetRange(preset);

    if (
      presetStart &&
      presetEnd &&
      toDateKey(presetStart) === toDateKey(startDate) &&
      toDateKey(presetEnd) === toDateKey(endDate)
    ) {
      return preset;
    }
  }

  return "custom";
};

const MonthYearPicker: React.FC<DatePickerProps> = ({
  selectedDate,
  onDateChange,
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
    <div className="relative w-65" ref={ref}>
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
        <div className="bg-base-100 border-base-300 absolute left-0 z-40 mt-2 w-full rounded-xl border p-3 shadow-lg">
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
  currentStartDate,
  currentEndDate,
}) => {
  const [activePreset, setActivePreset] = useState<PresetType>("all-time");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Hydrate the filter UI from parent state (URL-derived when available).
  useEffect(() => {
    if (currentStartDate && currentEndDate) {
      setActivePreset(resolvePresetFromRange(currentStartDate, currentEndDate));
      setStartDate(currentStartDate);
      setEndDate(currentEndDate);
      onDateRangeChange(currentStartDate, currentEndDate);
      return;
    }

    setActivePreset("all-time");
    setStartDate(null);
    setEndDate(null);
    onDateRangeChange(null, null);
  }, [currentStartDate, currentEndDate, onDateRangeChange]);

  const handlePresetClick = (preset: PresetType) => {
    setActivePreset(preset);

    if (preset === "all-time") {
      setStartDate(null);
      setEndDate(null);
      onDateRangeChange(null, null);
    } else if (preset === "custom") {
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
    { id: "all-time", label: "All time" },
    { id: "last-7-days", label: "Last 7 days" },
    { id: "last-3-months", label: "Last 3 months" },
    { id: "year-to-date", label: "Year to date" },
    { id: "custom", label: "Custom range" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Compact preset selector to reduce button clutter. */}
      <div className="flex flex-nowrap items-center gap-2">
        <span className="text-xs  whitespace-nowrap">Date range:</span>
        <Select
          value={activePreset}
          onValueChange={(value) => handlePresetClick(value as PresetType)}
        >
          <SelectTrigger
            className="w-52"
            disabled={Boolean(loading)}
          >
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            {presets.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom date range pickers */}
      {activePreset === "custom" && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs ">From:</span>
            <MonthYearPicker
              selectedDate={startDate}
              onDateChange={(date) => handleCustomDateChange("start", date)}
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">To:</span>
            <MonthYearPicker
              selectedDate={endDate}
              onDateChange={(date) => handleCustomDateChange("end", date)}
              disabled={loading}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagnosisDateFilter;
