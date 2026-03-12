"use client";

import { useEffect, useState } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PresetType = "last-7-days" | "last-3-months" | "year-to-date" | "custom";

const PRESETS: Array<{ id: PresetType; label: string }> = [
  { id: "last-7-days", label: "Last 7 days" },
  { id: "last-3-months", label: "Last 3 months" },
  { id: "year-to-date", label: "Year to date" },
  { id: "custom", label: "Custom range" },
];

const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDatePresetRange = (preset: PresetType): [string, string] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "last-7-days": {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      return [formatDateToString(start), formatDateToString(today)];
    }

    case "last-3-months": {
      const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      return [formatDateToString(start), formatDateToString(today)];
    }

    case "year-to-date": {
      const start = new Date(now.getFullYear(), 0, 1);
      return [formatDateToString(start), formatDateToString(today)];
    }

    case "custom":
    default:
      return ["", ""];
  }
};

const resolvePresetFromRange = (
  startDate: string,
  endDate: string,
): PresetType => {
  if (!startDate || !endDate) {
    return "custom";
  }

  const deterministicPresets: Array<Exclude<PresetType, "custom">> = [
    "last-7-days",
    "last-3-months",
    "year-to-date",
  ];

  for (const preset of deterministicPresets) {
    const [presetStart, presetEnd] = getDatePresetRange(preset);
    if (presetStart === startDate && presetEnd === endDate) {
      return preset;
    }
  }

  return "custom";
};

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  className?: string;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className,
}: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<PresetType>("last-3-months");

  useEffect(() => {
    if (!startDate && !endDate) {
      const [defaultStartDate, defaultEndDate] =
        getDatePresetRange("last-3-months");
      onStartDateChange(defaultStartDate);
      onEndDateChange(defaultEndDate);
      setActivePreset("last-3-months");
      return;
    }

    const nextPreset = resolvePresetFromRange(startDate, endDate);
    setActivePreset((currentPreset) =>
      currentPreset === nextPreset ? currentPreset : nextPreset,
    );
  }, [startDate, endDate, onStartDateChange, onEndDateChange]);

  const handlePresetChange = (preset: PresetType) => {
    setActivePreset(preset);

    if (preset === "custom") {
      return;
    }

    const [nextStartDate, nextEndDate] = getDatePresetRange(preset);

    if (nextStartDate !== startDate) {
      onStartDateChange(nextStartDate);
    }

    if (nextEndDate !== endDate) {
      onEndDateChange(nextEndDate);
    }
  };

  const handleStartDateChange = (date: string) => {
    if (activePreset !== "custom") {
      setActivePreset("custom");
    }

    if (date !== startDate) {
      onStartDateChange(date);
    }
  };

  const handleEndDateChange = (date: string) => {
    if (activePreset !== "custom") {
      setActivePreset("custom");
    }

    if (date !== endDate) {
      onEndDateChange(date);
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-nowrap items-center gap-2">
          <span className="text-xs whitespace-nowrap">Date range:</span>
          <Select
            value={activePreset}
            onValueChange={(value) => handlePresetChange(value as PresetType)}
          >
            <SelectTrigger className="h-8 w-52 text-xs">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {activePreset === "custom" ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 min-w-0">
              <DatePicker
                value={startDate}
                onChange={handleStartDateChange}
                className="w-full"
                placeholder="Start date"
              />
            </div>
            <span className="text-base-content/60 text-sm hidden sm:inline shrink-0">
              →
            </span>
            <div className="flex-1 min-w-0">
              <DatePicker
                value={endDate}
                onChange={handleEndDateChange}
                className="w-full"
                placeholder="End date"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
