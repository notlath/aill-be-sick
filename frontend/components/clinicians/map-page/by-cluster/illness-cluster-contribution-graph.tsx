"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { IllnessRecord } from "@/types";
import { getClusterBaseColor } from "@/utils/cluster-colors";

type IllnessClusterContributionGraphProps = {
  illnesses: IllnessRecord[];
  selectedCluster: number;
  clusterColorIndex: number;
};

type ContributionLevel = 0 | 1 | 2 | 3 | 4;

type ContributionDay = {
  key: string;
  date: Date;
  count: number;
  level: ContributionLevel;
};

type ContributionWeek = {
  weekStart: Date;
  days: ContributionDay[];
};

type MonthLabel = {
  weekIndex: number;
  label: string;
};

const WEEK_COLUMN_WIDTH_PX = 16;
const MIN_MONTH_LABEL_GAP_PX = 8;

function getDayKey(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().slice(0, 10);
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDayKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfWeekMonday(date: Date): Date {
  const value = new Date(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfWeekSunday(date: Date): Date {
  const value = startOfWeekMonday(date);
  value.setDate(value.getDate() + 6);
  return value;
}

function getContributionLevel(
  count: number,
  maxCount: number,
): ContributionLevel {
  if (count === 0 || maxCount === 0) return 0;

  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonthLabel(date: Date, includeYear: boolean): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    ...(includeYear ? { year: "numeric" as const } : {}),
  });
}

function filterOverlappingMonthLabels(labels: MonthLabel[]): MonthLabel[] {
  const visibleLabels: MonthLabel[] = [];
  let lastRightEdge = Number.NEGATIVE_INFINITY;

  for (const label of labels) {
    const left = label.weekIndex * WEEK_COLUMN_WIDTH_PX;
    const estimatedWidth = label.label.length * 6 + 8;
    const right = left + estimatedWidth;

    if (left < lastRightEdge + MIN_MONTH_LABEL_GAP_PX) {
      continue;
    }

    visibleLabels.push(label);
    lastRightEdge = right;
  }

  return visibleLabels;
}

function getBlockStyle(level: ContributionLevel, baseColor: string) {
  if (level === 0) {
    return {
      backgroundColor: "hsl(var(--heroui-default-100))",
      opacity: 1,
    };
  }

  const opacityByLevel: Record<Exclude<ContributionLevel, 0>, number> = {
    1: 0.25,
    2: 0.45,
    3: 0.65,
    4: 0.9,
  };

  return {
    backgroundColor: baseColor,
    opacity: opacityByLevel[level],
  };
}

export function IllnessClusterContributionGraph({
  illnesses,
  selectedCluster,
  clusterColorIndex,
}: IllnessClusterContributionGraphProps) {
  const clusterColor = useMemo(
    () => getClusterBaseColor(clusterColorIndex),
    [clusterColorIndex],
  );

  const graph = useMemo(() => {
    const withDates = illnesses.filter(
      (illness) => illness.diagnosed_at && illness.cluster === selectedCluster,
    );

    if (withDates.length === 0) return null;

    const dayCounts = new Map<string, number>();
    for (const illness of withDates) {
      const key = getDayKey(illness.diagnosed_at!);
      dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
    }

    const sortedKeys = [...dayCounts.keys()].sort((a, b) => a.localeCompare(b));
    const firstDate = parseDayKey(sortedKeys[0]);
    const lastDate = parseDayKey(sortedKeys[sortedKeys.length - 1]);
    const firstVisibleMonthStart = new Date(
      firstDate.getFullYear(),
      firstDate.getMonth(),
      1,
    );

    const rangeStart = startOfWeekMonday(firstVisibleMonthStart);
    const rangeEnd = endOfWeekSunday(
      new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 0),
    );

    const maxCount = Math.max(...dayCounts.values());

    const days: ContributionDay[] = [];
    const cursor = new Date(rangeStart);
    while (cursor <= rangeEnd) {
      const key = dateKey(cursor);
      const count = dayCounts.get(key) || 0;

      days.push({
        key,
        date: new Date(cursor),
        count,
        level: getContributionLevel(count, maxCount),
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    const weeks: ContributionWeek[] = [];
    for (let index = 0; index < days.length; index += 7) {
      weeks.push({
        weekStart: days[index].date,
        days: days.slice(index, index + 7),
      });
    }

    const monthLabels = weeks
      .map((week, weekIndex) => {
        const currentLabelDate =
          week.weekStart < firstVisibleMonthStart
            ? firstVisibleMonthStart
            : week.weekStart;
        const previousWeek = weeks[weekIndex - 1];

        if (!previousWeek) {
          return {
            weekIndex,
            label: formatMonthLabel(currentLabelDate, true),
          };
        }

        const previousLabelDate =
          previousWeek.weekStart < firstVisibleMonthStart
            ? firstVisibleMonthStart
            : previousWeek.weekStart;

        const isSameMonth =
          currentLabelDate.getMonth() === previousLabelDate.getMonth() &&
          currentLabelDate.getFullYear() === previousLabelDate.getFullYear();

        if (isSameMonth) return null;

        const includeYear =
          currentLabelDate.getFullYear() !== previousLabelDate.getFullYear();

        return {
          weekIndex,
          label: formatMonthLabel(currentLabelDate, includeYear),
        };
      })
      .filter(
        (item): item is { weekIndex: number; label: string } => item !== null,
      );

    const visibleMonthLabels = filterOverlappingMonthLabels(monthLabels);

    return {
      totalCount: withDates.length,
      weeks,
      monthLabels: visibleMonthLabels,
    };
  }, [illnesses, selectedCluster]);

  if (!graph) {
    return (
      <Card className="relative overflow-hidden border">
        <div className="absolute inset-0 bg-base-100 opacity-90" />
        <CardContent className="relative py-8 text-center text-sm text-base-content/70">
          No daily activity data available for this group
        </CardContent>
      </Card>
    );
  }

  const graphWidth = graph.weeks.length * WEEK_COLUMN_WIDTH_PX;

  return (
    <Card className="relative overflow-hidden border">
      <div className="absolute inset-0 bg-base-100 opacity-90" />
      <CardHeader className="relative pb-2">
        <p className="font-semibold text-base">Daily Illness Activity</p>
        <p className="text-xs text-base-content/70">
          {graph.totalCount} diagnosis record
          {graph.totalCount !== 1 ? "s" : ""} across the selected period
        </p>
      </CardHeader>

      <CardContent className="relative pt-2">
        <div className="overflow-x-auto">
          <div className="min-w-max">
            <div
              className="relative h-4 mb-2 ml-10"
              style={{ width: graphWidth }}
            >
              {graph.monthLabels.map((month) => (
                <span
                  key={`${month.label}-${month.weekIndex}`}
                  className="absolute text-[10px] text-base-content/70 whitespace-nowrap"
                  style={{
                    left: `${month.weekIndex * WEEK_COLUMN_WIDTH_PX}px`,
                  }}
                >
                  {month.label}
                </span>
              ))}
            </div>

            <div className="flex items-start gap-2">
              <div className="grid grid-rows-7 gap-1 text-[10px] text-base-content/60 pt-px w-8">
                <span>Mon</span>
                <span />
                <span>Wed</span>
                <span />
                <span>Fri</span>
                <span />
                <span>Sun</span>
              </div>

              <div className="flex gap-1">
                {graph.weeks.map((week) => (
                  <div
                    key={week.weekStart.toISOString()}
                    className="grid grid-rows-7 gap-1"
                  >
                    {week.days.map((day) => (
                      <div
                        key={day.key}
                        className="h-3 w-3 rounded-[3px] border border-base-300/40"
                        style={getBlockStyle(day.level, clusterColor)}
                        title={`${formatDateLabel(day.date)}: ${day.count} illness${day.count === 1 ? "" : "es"}`}
                        aria-label={`${formatDateLabel(day.date)} with ${day.count} illness cases`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 text-[11px] text-base-content/70">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={`legend-${level}`}
              className="h-3 w-3 rounded-[3px] border border-base-300/40"
              style={getBlockStyle(level as ContributionLevel, clusterColor)}
              aria-hidden
            />
          ))}
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
