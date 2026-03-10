"use client";

import { DatePicker } from "@/components/ui/date-picker";

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
  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex-1 min-w-0">
          <DatePicker
            value={startDate}
            onChange={onStartDateChange}
            className="w-full"
            placeholder="Start date"
          />
        </div>
        <span className="text-base-content/60 text-sm hidden sm:inline shrink-0">→</span>
        <div className="flex-1 min-w-0">
          <DatePicker
            value={endDate}
            onChange={onEndDateChange}
            className="w-full"
            placeholder="End date"
          />
        </div>
      </div>
    </div>
  );
}
