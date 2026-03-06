"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DiseaseTimelineChartProps = {
  dates: string[];
  disease: string;
  diseaseColor: string;
};

type TimeGranularity = "day" | "week" | "month";

type TimeBucket = {
  label: string;
  periodStart: string;
  periodEnd: string;
  count: number;
};

function getDayKey(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

function getISOWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
    "en-US",
    { month: "short", year: "numeric" },
  );
}

type DiseaseTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: TimeBucket }>;
  label?: string | number;
  granularity: TimeGranularity;
};

function DiseaseChartTooltip({
  active,
  payload,
  label,
  granularity,
}: DiseaseTooltipProps) {
  if (!active || !payload?.length) return null;
  const bucket = payload[0].payload;
  return (
    <div className="bg-white border border-base-300 rounded shadow-sm px-3 py-2 text-xs">
      <p className="mb-1 font-medium">
        {granularity === "week"
          ? `${bucket.periodStart} – ${bucket.periodEnd}`
          : label}
      </p>
      <p>
        {bucket.count} case{bucket.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function DiseaseTimelineChart({
  dates,
  disease,
  diseaseColor,
}: DiseaseTimelineChartProps) {
  const [granularity, setGranularity] = useState<TimeGranularity>("month");

  const chartData = useMemo<TimeBucket[]>(() => {
    if (!dates || dates.length === 0) return [];

    const bucketMap = new Map<string, number>();

    for (const date of dates) {
      if (!date) continue;
      const key =
        granularity === "day"
          ? getDayKey(date)
          : granularity === "week"
            ? getISOWeekKey(date)
            : getMonthKey(date);

      bucketMap.set(key, (bucketMap.get(key) ?? 0) + 1);
    }

    const sorted = [...bucketMap.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    );

    return sorted.map(([periodKey, count]) => {
      let label: string;
      let periodStart: string;
      let periodEnd: string;

      if (granularity === "day") {
        label = formatShortDate(periodKey);
        periodStart = label;
        periodEnd = label;
      } else if (granularity === "week") {
        label = formatShortDate(periodKey);
        periodStart = label;
        const endDate = new Date(periodKey);
        endDate.setDate(endDate.getDate() + 6);
        periodEnd = formatShortDate(endDate.toISOString().slice(0, 10));
      } else {
        label = formatMonth(periodKey);
        periodStart = label;
        periodEnd = label;
      }

      return { label, periodStart, periodEnd, count };
    });
  }, [dates, granularity]);

  if (chartData.length === 0) {
    return (
      <div className="bg-base-200 rounded-box p-4 text-center text-sm text-base-content/70">
        No temporal data available for {disease === "All" ? "all diseases" : disease}
      </div>
    );
  }

  const gradientId = `diseaseGradient-${diseaseColor.replace("#", "")}`;

  return (
    <div className="bg-base-200 rounded-box p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-sm">{disease === "All" ? "All Diseases" : disease} — Cases Over Time</p>
        <Select
          className="w-auto"
          value={granularity}
          onValueChange={(v) => setGranularity(v as TimeGranularity)}
        >
          <SelectTrigger className="w-28 h-7 text-xs bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">By day</SelectItem>
            <SelectItem value="week">By week</SelectItem>
            <SelectItem value="month">By month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 10, bottom: 5, left: -10 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={diseaseColor}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={diseaseColor}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--heroui-default-200))"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "hsl(var(--heroui-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--heroui-default-200))" }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "hsl(var(--heroui-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--heroui-default-200))" }}
            />
            <Tooltip
              content={(props) => (
                <DiseaseChartTooltip {...props} granularity={granularity} />
              )}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={diseaseColor}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
