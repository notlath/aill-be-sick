"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/utils/lib";
import "react-day-picker/dist/style.css";

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function DatePicker({
  value,
  onChange,
  disabled,
  className,
  placeholder = "Pick a date",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined,
  );
  const [today, setToday] = React.useState<Date | undefined>(undefined);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setToday(now);
  }, []);

  React.useEffect(() => {
    if (!value) {
      setSelectedDate(undefined);
      return;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return;

    setSelectedDate(parsedDate);
  }, [value]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (date: Date | undefined) => {
    if (!date || !today) return;

    const nextDate = new Date(date);
    nextDate.setHours(0, 0, 0, 0);

    if (nextDate > today) return;

    setSelectedDate(nextDate);
    onChange(format(nextDate, "yyyy-MM-dd"));
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 w-full justify-start",
          "px-4 py-2.5 rounded-[10px]",
          "bg-white/50 backdrop-blur-sm",
          "border border-border",
          "hover:bg-white/70 hover:border-base-300/70",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40",
          "transition-all duration-200",
          "text-sm text-base-content text-left font-normal",
          "whitespace-nowrap shrink-0 min-w-[180px]",
          className,
        )}
      >
        <Calendar className="mr-2 h-4 w-4 shrink-0" />
        <span className="truncate">{selectedDate ? format(selectedDate, "MMM d, yyyy") : placeholder}</span>
      </button>

      {isOpen && today && (
        <div className="absolute top-full left-0 z-50 mt-2 w-full min-w-70">
          <div className="card bg-base-100 border border-base-300 shadow-lg">
            <div className="card-body p-3">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={handleSelect}
                disabled={disabled ? true : { after: today }}
                captionLayout="dropdown"
                startMonth={new Date(1900, 0)}
                endMonth={today}
                defaultMonth={selectedDate || today}
                reverseYears
                hideNavigation
                showOutsideDays={false}
                className="w-full"
                classNames={{
                  root: "w-full",
                  months: "flex justify-center",
                  month: "space-y-2",
                  month_caption:
                    "flex items-center justify-start text-sm text-base-content font-normal",
                  caption_label: "hidden",
                  dropdowns: "flex flex-row-reverse items-center gap-2",
                  dropdown_root: "inline-flex items-center",
                  dropdown: "select select-bordered select-sm h-9 min-h-9",
                  nav: "flex items-center gap-1",
                  button_previous:
                    "btn btn-ghost btn-xs absolute left-2 top-2 text-primary",
                  button_next:
                    "btn btn-ghost btn-xs absolute right-2 top-2 text-primary",
                  weekdays: "grid grid-cols-7 mt-2",
                  weekday:
                    "text-xs text-base-content/60 font-medium text-center",
                  week: "grid grid-cols-7",
                  day: "flex items-center justify-center",
                  day_button:
                    "btn btn-ghost btn-sm h-9 min-h-9 w-9 p-0 font-normal hover:bg-primary/10 hover:text-primary rounded-lg",
                  today: "text-primary font-semibold",
                  selected:
                    "[&>button]:bg-primary [&>button]:text-primary-content [&>button]:border-2 [&>button]:border-primary [&>button]:rounded-lg hover:[&>button]:bg-primary hover:[&>button]:text-primary-content",
                  outside: "text-base-content/30",
                  disabled: "text-base-content/30 opacity-60",
                }}
                style={
                  {
                    "--rdp-accent-color": "var(--color-primary)",
                    "--rdp-accent-background-color":
                      "color-mix(in oklab, var(--color-primary) 18%, transparent)",
                    "--rdp-today-color": "var(--color-primary)",
                  } as React.CSSProperties
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
