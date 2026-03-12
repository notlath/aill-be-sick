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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { SurveillanceAnomaly } from "@/types";

export type AnomalyTimelineChartProps = {
  /** Anomalies already filtered to the selected disease by the caller */
  anomalies: SurveillanceAnomaly[];
  disease: string;
  /** Hex colour derived from getClusterBaseColor for the selected disease */
  diseaseColor: string;
};

type TimeGranularity = "day" | "week" | "month";

type TimeBucket = {
  label: string;
  periodStart: string;
  periodEnd: string;
  count: number;
};

// ─── Date helpers (mirrors illness-cluster-timeline-chart) ───────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

export function AnomalyTimelineChart({
  anomalies,
  disease,
  diseaseColor,
}: AnomalyTimelineChartProps) {
  const [granularity, setGranularity] = useState<TimeGranularity>("day");

  const chartData = useMemo<TimeBucket[]>(() => {
    const withDates = anomalies.filter((a) => !!a.createdAt);
    if (withDates.length === 0) return [];

    const bucketMap = new Map<string, number>();

    for (const anomaly of withDates) {
      const key =
        granularity === "day"
          ? getDayKey(anomaly.createdAt)
          : granularity === "week"
            ? getISOWeekKey(anomaly.createdAt)
            : getMonthKey(anomaly.createdAt);

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
  }, [anomalies, granularity]);

  if (chartData.length === 0) {
    return (
      <Card className="relative overflow-hidden border">
        <div className="absolute inset-0 bg-base-100 opacity-90" />
        <CardContent className="relative py-8 text-center text-sm text-base-content/70">
          No temporal data available for {disease} anomalies
        </CardContent>
      </Card>
    );
  }

  const gradientId = `anomalyGradient-${diseaseColor.replace("#", "")}`;

  return (
    <Card className="relative overflow-hidden border">
      <div className="absolute inset-0 bg-base-100 opacity-90" />

      <CardHeader className="relative pb-2 flex flex-row items-center justify-between gap-4">
        <p className="font-semibold text-base">
          {disease === "all" ? "All Diseases" : disease} — Anomalies Over Time
        </p>
        <Select
          value={granularity}
          onValueChange={(v) => setGranularity(v as TimeGranularity)}
          className="w-auto"
        >
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="right-0 left-auto">
            <SelectItem value="day">By day</SelectItem>
            <SelectItem value="week">By week</SelectItem>
            <SelectItem value="month">By month</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="relative pt-2">
        <div className="w-full h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={diseaseColor}
                    stopOpacity={0.8}
                  />
                  <stop offset="95%" stopColor={diseaseColor} stopOpacity={0} />
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
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const bucket = payload[0].payload as TimeBucket;
                  return (
                    <div className="bg-white border border-base-300 rounded shadow-sm px-3 py-2 text-xs">
                      <p className="font-semibold mb-1">
                        {granularity === "week"
                          ? `${bucket.periodStart} – ${bucket.periodEnd}`
                          : label}
                      </p>
                      <p>
                        {bucket.count} anomal{bucket.count === 1 ? "y" : "ies"}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke={diseaseColor}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
