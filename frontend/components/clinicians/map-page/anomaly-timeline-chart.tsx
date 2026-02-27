"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SurveillanceAnomaly } from "@/types";

type AnomalyTimelineChartProps = {
  anomalyData: SurveillanceAnomaly[];
  selectedDisease: string;
  diseaseBaseColor: string;
};

type WeekBucket = {
  label: string;
  weekStart: string;
  weekEnd: string;
  count: number;
};

function getISOWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  // Get Monday of this week
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function AnomalyTimelineChart({
  anomalyData,
  selectedDisease,
  diseaseBaseColor,
}: AnomalyTimelineChartProps) {
  const chartData = useMemo<WeekBucket[]>(() => {
    const filtered = anomalyData.filter((a) => a.disease === selectedDisease);
    if (filtered.length === 0) return [];

    // Group by ISO week
    const weekMap = new Map<string, number>();
    for (const anomaly of filtered) {
      const weekKey = getISOWeekKey(anomaly.created_at);
      weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + 1);
    }

    // Sort by week key and build buckets
    const sortedWeeks = [...weekMap.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    );

    return sortedWeeks.map(([weekStart, count]) => {
      const endDate = new Date(weekStart);
      endDate.setDate(endDate.getDate() + 6);
      const weekEnd = endDate.toISOString().slice(0, 10);

      return {
        label: formatShortDate(weekStart),
        weekStart: formatShortDate(weekStart),
        weekEnd: formatShortDate(weekEnd),
        count,
      };
    });
  }, [anomalyData, selectedDisease]);

  if (chartData.length === 0) {
    return (
      <div className="bg-base-200 rounded-box p-4 text-center text-sm text-base-content/70">
        No anomaly data to chart for {selectedDisease}
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-box p-4">
      <p className="font-semibold text-sm mb-3">
        Anomalies per Week — {selectedDisease}
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
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
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const data = payload[0].payload as WeekBucket;
              return (
                <div className="bg-white border border-base-300 rounded shadow-sm px-3 py-2 text-xs">
                  <p className="font-semibold">
                    {data.weekStart} – {data.weekEnd}
                  </p>
                  <p>
                    {data.count} {selectedDisease} anomal{data.count === 1 ? "y" : "ies"}
                  </p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="count"
            fill={diseaseBaseColor}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
