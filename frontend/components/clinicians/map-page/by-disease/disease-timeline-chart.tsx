"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
import { Diagnosis } from "@/lib/generated/prisma";
import { getDiseaseColorScale } from "@/utils/map-helpers";
import type { DiseaseType } from "@/stores/use-selected-disease-store";

type DiseaseTimelineChartProps = {
  diagnoses: Diagnosis[];
  disease: DiseaseType;
};

type TimeGranularity = "day" | "week" | "month";

type TimeBucket = {
  label: string;
  periodStart: string;
  periodEnd: string;
  count: number;
};

const COMPARE_DISEASES = [
  "Dengue",
  "Pneumonia",
  "Typhoid",
  "Diarrhea",
  "Measles",
  "Influenza",
] as const;

type CompareDisease = (typeof COMPARE_DISEASES)[number];

type ChartDataPoint = {
  label: string;
  periodStart: string;
  periodEnd: string;
  count?: number;
} & Partial<Record<CompareDisease, number>>;

const DISEASE_LOOKUP = new Map(
  COMPARE_DISEASES.map((disease) => [disease.toLowerCase(), disease]),
);

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

function normalizeDiseaseName(rawDisease?: string | null): CompareDisease | null {
  if (!rawDisease) return null;
  return DISEASE_LOOKUP.get(rawDisease.toLowerCase()) ?? null;
}

function ChartTooltip({
  active,
  payload,
  label,
  granularity,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; payload?: any }>;
  label?: string;
  granularity: TimeGranularity;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload as ChartDataPoint | undefined;
  const rangeLabel =
    granularity === "week" && data
      ? `${data.periodStart} – ${data.periodEnd}`
      : label;

  return (
    <div className="bg-base-100 border border-base-300 rounded shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold mb-1">{rangeLabel}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div
            key={`${entry.name ?? "series"}-${index}`}
            className="flex items-center gap-2"
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-base-content/70">{entry.name}</span>
            <span className="ml-auto font-mono font-medium">
              {Number(entry.value || 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartLegend({ payload }: { payload?: Array<{ value?: string; color?: string }> }) {
  if (!payload?.length) return null;

  return (
    <div className="flex flex-wrap justify-center gap-3 pt-2 text-xs text-base-content/70">
      {payload.map((entry, index) => (
        <div
          key={`${entry.value ?? "series"}-${index}`}
          className="flex items-center gap-1.5"
        >
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function DiseaseTimelineChart({
  diagnoses,
  disease,
}: DiseaseTimelineChartProps) {
  const [granularity, setGranularity] = useState<TimeGranularity>("month");
  const isAllDiseases = disease === "all";

  const diseaseColor = useMemo(() => {
    const scale = getDiseaseColorScale(disease);
    return scale(40).hex();
  }, [disease]);

  const multiSeriesColors = useMemo(() => {
    return COMPARE_DISEASES.reduce(
      (acc, diseaseName) => {
        acc[diseaseName] = getDiseaseColorScale(diseaseName)(40).hex();
        return acc;
      },
      {} as Record<CompareDisease, string>,
    );
  }, []);

  const chartData = useMemo<ChartDataPoint[]>(() => {
    const withDates = diagnoses.filter((d) => d.createdAt);
    if (withDates.length === 0) return [];

    if (!isAllDiseases) {
      const bucketMap = new Map<string, number>();

      for (const diagnosis of withDates) {
        const key =
          granularity === "day"
            ? getDayKey(diagnosis.createdAt.toISOString())
            : granularity === "week"
              ? getISOWeekKey(diagnosis.createdAt.toISOString())
              : getMonthKey(diagnosis.createdAt.toISOString());

        bucketMap.set(key, (bucketMap.get(key) || 0) + 1);
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
    }

    const bucketMap = new Map<string, Record<CompareDisease, number>>();

    for (const diagnosis of withDates) {
      const key =
        granularity === "day"
          ? getDayKey(diagnosis.createdAt.toISOString())
          : granularity === "week"
            ? getISOWeekKey(diagnosis.createdAt.toISOString())
            : getMonthKey(diagnosis.createdAt.toISOString());
      const normalizedDisease = normalizeDiseaseName(diagnosis.disease);
      if (!normalizedDisease) continue;

      const bucket = bucketMap.get(key) ?? {
        Dengue: 0,
        Pneumonia: 0,
        Typhoid: 0,
        Diarrhea: 0,
        Measles: 0,
        Influenza: 0,
      };

      bucket[normalizedDisease] += 1;
      bucketMap.set(key, bucket);
    }

    const sorted = [...bucketMap.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    );

    return sorted.map(([periodKey, bucket]) => {
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
        ...bucket,
      };
    });
  }, [diagnoses, granularity, isAllDiseases]);

  if (chartData.length === 0) {
    return (
      <Card className="relative overflow-hidden border">
        <div className="absolute inset-0 bg-base-100 opacity-90" />
        <CardContent className="relative py-8 text-center text-sm text-base-content/70">
          No temporal data available for the selected diseases
        </CardContent>
      </Card>
    );
  }

  const gradientId = `diseaseColorGradient-${disease.replace("#", "")}`;

  return (
    <Card className="relative overflow-hidden border">
      <CardContent className="relative pt-2">
        <div className="flex justify-end mb-2">
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
        </div>
        <div className="w-full h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            {isAllDiseases ? (
                <LineChart
                data={chartData}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                accessibilityLayer
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-base-300)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--color-base-content)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--color-base-300)" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--color-base-content)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--color-base-300)" }}
                />
                <Tooltip
                  content={
                    <ChartTooltip granularity={granularity} />
                  }
                />
                <Legend content={<ChartLegend />} />
                {COMPARE_DISEASES.map((diseaseName) => (
                  <Line
                    key={diseaseName}
                    type="monotone"
                    dataKey={diseaseName}
                    name={diseaseName}
                    stroke={multiSeriesColors[diseaseName]}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            ) : (
              <AreaChart
                data={chartData}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                accessibilityLayer
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={diseaseColor} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={diseaseColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-base-300)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--color-base-content)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--color-base-300)" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--color-base-content)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--color-base-300)" }}
                />
                <Tooltip content={<ChartTooltip granularity={granularity} />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name={disease}
                  stroke={diseaseColor}
                  fillOpacity={1}
                  fill={`url(#${gradientId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
