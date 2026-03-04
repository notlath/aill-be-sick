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
import type { IllnessRecord } from "@/types";
import { getClusterBaseColor } from "@/utils/cluster-colors";

type IllnessClusterTimelineChartProps = {
  illnesses: IllnessRecord[];
  nClusters: number;
  selectedCluster: number;
  clusterColorIndex: number;
};

type TimeGranularity = "day" | "week" | "month";

type TimeBucket = {
  label: string;
  periodStart: string;
  periodEnd: string;
  count: number;
};

function getDayKey(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString().slice(0, 10);
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
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function IllnessClusterTimelineChart({
  illnesses,
  nClusters,
  selectedCluster,
  clusterColorIndex,
}: IllnessClusterTimelineChartProps) {
  const [granularity, setGranularity] = useState<TimeGranularity>("month");

  const clusterColor = useMemo(
    () => getClusterBaseColor(clusterColorIndex),
    [clusterColorIndex],
  );

  const chartData = useMemo<TimeBucket[]>(() => {
    // Filter to selected cluster illnesses with diagnosed_at
    const withDates = illnesses.filter(
      (i) => i.diagnosed_at && i.cluster === selectedCluster,
    );
    if (withDates.length === 0) return [];

    // Group by time period
    const bucketMap = new Map<string, number>();

    for (const illness of withDates) {
      const key =
        granularity === "day"
          ? getDayKey(illness.diagnosed_at!)
          : granularity === "week"
            ? getISOWeekKey(illness.diagnosed_at!)
            : getMonthKey(illness.diagnosed_at!);

      bucketMap.set(key, (bucketMap.get(key) || 0) + 1);
    }

    // Sort and build buckets
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
        periodStart = formatShortDate(periodKey);
        const endDate = new Date(periodKey);
        endDate.setDate(endDate.getDate() + 6);
        periodEnd = formatShortDate(endDate.toISOString().slice(0, 10));
      } else {
        label = formatMonth(periodKey);
        periodStart = label;
        periodEnd = label;
      }

      return {
        label,
        periodStart,
        periodEnd,
        count,
      };
    });
  }, [illnesses, selectedCluster, granularity]);

  if (chartData.length === 0) {
    return (
      <div className="bg-base-200 rounded-box p-4 text-center text-sm text-base-content/70">
        No temporal data available for this cluster
      </div>
    );
  }

  // Create a unique ID for the gradient based on the cluster color
  const gradientId = `colorGradient-${clusterColor.replace("#", "")}`;

  return (
    <div className="bg-base-200 rounded-box p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-sm">
          Cluster {selectedCluster} — Illnesses Over Time
        </p>
        <Select
          value={granularity}
          onValueChange={(v) => setGranularity(v as TimeGranularity)}
          className="w-auto"
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
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={clusterColor} stopOpacity={0.8} />
              <stop offset="95%" stopColor={clusterColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "#d1d5db" }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "#d1d5db" }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null;
              const data = payload[0].payload as TimeBucket;
              return (
                <div className="bg-white border border-base-300 rounded shadow-sm px-3 py-2 text-xs">
                  <p className="font-semibold mb-1">
                    {granularity === "week"
                      ? `${data.periodStart} – ${data.periodEnd}`
                      : label}
                  </p>
                  <p>
                    {data.count} illness{data.count === 1 ? "" : "es"}
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={clusterColor}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
