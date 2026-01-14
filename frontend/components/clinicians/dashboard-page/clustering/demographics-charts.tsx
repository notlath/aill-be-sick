"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3, PieChart, Users, Activity } from "lucide-react";
import type { ClusterStatistics, Patient } from "@/types/clustering";

interface DemographicsChartsProps {
  statistics: ClusterStatistics[];
  patients: Patient[];
}

const CLUSTER_THEMES = [
  {
    color: "#3b82f6",
    name: "blue",
    lightBg: "bg-blue-50",
    darkBg: "bg-blue-500",
  },
  {
    color: "#10b981",
    name: "emerald",
    lightBg: "bg-emerald-50",
    darkBg: "bg-emerald-500",
  },
  {
    color: "#8b5cf6",
    name: "purple",
    lightBg: "bg-purple-50",
    darkBg: "bg-purple-500",
  },
  {
    color: "#f97316",
    name: "orange",
    lightBg: "bg-orange-50",
    darkBg: "bg-orange-500",
  },
  {
    color: "#ec4899",
    name: "pink",
    lightBg: "bg-pink-50",
    darkBg: "bg-pink-500",
  },
  {
    color: "#6366f1",
    name: "indigo",
    lightBg: "bg-indigo-50",
    darkBg: "bg-indigo-500",
  },
  {
    color: "#06b6d4",
    name: "cyan",
    lightBg: "bg-cyan-50",
    darkBg: "bg-cyan-500",
  },
  {
    color: "#f43f5e",
    name: "rose",
    lightBg: "bg-rose-50",
    darkBg: "bg-rose-500",
  },
];

const DemographicsCharts: React.FC<DemographicsChartsProps> = ({
  statistics,
  patients,
}) => {
  // Calculate age distribution per cluster
  const getAgeGroups = (clusterPatients: Patient[]) => {
    const groups = {
      "18-30": 0,
      "31-45": 0,
      "46-60": 0,
      "61-80": 0,
    };

    clusterPatients.forEach((p) => {
      if (p.age >= 18 && p.age <= 30) groups["18-30"]++;
      else if (p.age >= 31 && p.age <= 45) groups["31-45"]++;
      else if (p.age >= 46 && p.age <= 60) groups["46-60"]++;
      else if (p.age >= 61 && p.age <= 80) groups["61-80"]++;
    });

    return groups;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Age Distribution by Cluster */}
      <Card className="group hover:border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-3 rounded-[12px]">
              <BarChart3 className="size-6 text-primary stroke-[2]" />
            </div>
            <div>
              <CardTitle className="text-2xl tracking-tight">
                Age Distribution
              </CardTitle>
              <CardDescription className="mt-1">
                Patient age groups across clusters
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {statistics.map((stat, clusterIndex) => {
              const clusterPatients = patients.filter(
                (p) => p.cluster === stat.cluster_id
              );
              const ageGroups = getAgeGroups(clusterPatients);
              const maxCount = Math.max(...Object.values(ageGroups));
              const dist = stat.disease_distribution || {};
              const entries = Object.entries(dist).sort(
                (a, b) => b[1].percent - a[1].percent
              );
              const dominantDisease = entries.length > 0 ? entries[0][0] : null;
              const theme =
                CLUSTER_THEMES[clusterIndex % CLUSTER_THEMES.length];

              return (
                <div key={stat.cluster_id} className="space-y-3">
                  {/* Cluster Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-base-300/50">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: theme.color }}
                      ></div>
                      <span className="font-semibold text-sm text-base-content">
                        {dominantDisease
                          ? `${stat.cluster_id + 1}. ${dominantDisease}`
                          : `Cluster ${stat.cluster_id + 1}`}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-muted bg-base-200/50 px-2.5 py-1 rounded-full">
                      Avg: {stat.avg_age} yrs
                    </span>
                  </div>

                  {/* Age Bars */}
                  <div className="space-y-2.5">
                    {Object.entries(ageGroups).map(([range, count]) => {
                      const percentage =
                        maxCount > 0 ? (count / maxCount) * 100 : 0;
                      return (
                        <div key={range} className="flex items-center gap-3">
                          <span className="text-xs font-medium text-muted/80 w-14 text-right">
                            {range}
                          </span>
                          <div className="flex-1 bg-base-200/50 rounded-full h-8 overflow-hidden">
                            <div
                              className="h-full flex items-center justify-end px-3 text-xs font-semibold text-white transition-all duration-500 rounded-full"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: theme.color,
                                minWidth: count > 0 ? "36px" : "0px",
                              }}
                            >
                              {count > 0 && count}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Gender Distribution */}
      <Card className="group hover:border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 p-3 rounded-[12px]">
              <PieChart className="size-6 text-secondary stroke-[2]" />
            </div>
            <div>
              <CardTitle className="text-2xl tracking-tight">
                Gender Distribution
              </CardTitle>
              <CardDescription className="mt-1">
                Male/Female ratio across clusters
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {statistics.map((stat, clusterIndex) => {
              const total =
                stat.gender_distribution.MALE +
                stat.gender_distribution.FEMALE +
                stat.gender_distribution.OTHER;
              const malePercent =
                total > 0 ? (stat.gender_distribution.MALE / total) * 100 : 0;
              const femalePercent =
                total > 0 ? (stat.gender_distribution.FEMALE / total) * 100 : 0;
              const otherPercent =
                total > 0 ? (stat.gender_distribution.OTHER / total) * 100 : 0;
              const dist = stat.disease_distribution || {};
              const entries = Object.entries(dist).sort(
                (a, b) => b[1].percent - a[1].percent
              );
              const dominantDisease = entries.length > 0 ? entries[0][0] : null;
              const theme =
                CLUSTER_THEMES[clusterIndex % CLUSTER_THEMES.length];

              return (
                <div key={stat.cluster_id} className="space-y-3">
                  {/* Cluster Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-base-300/50">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: theme.color }}
                      ></div>
                      <span className="font-semibold text-sm text-base-content">
                        {dominantDisease
                          ? `${stat.cluster_id + 1}. ${dominantDisease}`
                          : `Cluster ${stat.cluster_id + 1}`}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-muted bg-base-200/50 px-2.5 py-1 rounded-full">
                      {stat.count} patients
                    </span>
                  </div>

                  {/* Visual bar */}
                  <div className="flex h-10 rounded-[10px] overflow-hidden border border-base-300/50 shadow-sm">
                    {malePercent > 0 && (
                      <div
                        className="bg-blue-500 flex items-center justify-center text-xs font-semibold text-white transition-all duration-500"
                        style={{ width: `${malePercent}%` }}
                      >
                        {malePercent > 12 && `${Math.round(malePercent)}%`}
                      </div>
                    )}
                    {femalePercent > 0 && (
                      <div
                        className="bg-pink-500 flex items-center justify-center text-xs font-semibold text-white transition-all duration-500"
                        style={{ width: `${femalePercent}%` }}
                      >
                        {femalePercent > 12 && `${Math.round(femalePercent)}%`}
                      </div>
                    )}
                    {otherPercent > 0 && (
                      <div
                        className="bg-gray-400 flex items-center justify-center text-xs font-semibold text-white transition-all duration-500"
                        style={{ width: `${otherPercent}%` }}
                      >
                        {otherPercent > 12 && `${Math.round(otherPercent)}%`}
                      </div>
                    )}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-[6px] bg-blue-500 shadow-sm"></div>
                      <span className="font-medium text-base-content/80">
                        Male:{" "}
                        <span className="font-semibold text-base-content">
                          {stat.gender_distribution.MALE}
                        </span>
                        <span className="text-muted ml-1">
                          ({Math.round(malePercent)}%)
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-[6px] bg-pink-500 shadow-sm"></div>
                      <span className="font-medium text-base-content/80">
                        Female:{" "}
                        <span className="font-semibold text-base-content">
                          {stat.gender_distribution.FEMALE}
                        </span>
                        <span className="text-muted ml-1">
                          ({Math.round(femalePercent)}%)
                        </span>
                      </span>
                    </div>
                    {stat.gender_distribution.OTHER > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-[6px] bg-gray-400 shadow-sm"></div>
                        <span className="font-medium text-base-content/80">
                          Other:{" "}
                          <span className="font-semibold text-base-content">
                            {stat.gender_distribution.OTHER}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cluster Size Comparison */}
      <Card className="md:col-span-2 group hover:border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-accent/10 to-accent/5 p-3 rounded-[12px]">
              <Users className="size-6 text-accent stroke-[2]" />
            </div>
            <div>
              <CardTitle className="text-2xl tracking-tight">
                Cluster Size Comparison
              </CardTitle>
              <CardDescription className="mt-1">
                Patient distribution across identified clusters
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {statistics.map((stat, clusterIndex) => {
              const totalPatients = statistics.reduce(
                (sum, s) => sum + s.count,
                0
              );
              const percentage =
                totalPatients > 0 ? (stat.count / totalPatients) * 100 : 0;
              const dist = stat.disease_distribution || {};
              const entries = Object.entries(dist).sort(
                (a, b) => b[1].percent - a[1].percent
              );
              const dominantDisease = entries.length > 0 ? entries[0][0] : null;
              const theme =
                CLUSTER_THEMES[clusterIndex % CLUSTER_THEMES.length];

              return (
                <div key={stat.cluster_id} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-[8px] shadow-sm"
                        style={{ backgroundColor: theme.color }}
                      ></div>
                      <span className="font-semibold text-sm text-base-content">
                        {dominantDisease
                          ? `${stat.cluster_id + 1}. ${dominantDisease}`
                          : `Cluster ${stat.cluster_id + 1}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-muted">
                        {stat.count} patients
                      </span>
                      <span className="font-bold text-lg min-w-[60px] text-right tabular-nums text-base-content">
                        {Math.round(percentage)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-base-200/50 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full transition-all duration-500 rounded-full"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: theme.color,
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Disease Composition by Cluster */}
      <Card className="md:col-span-2 group hover:border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-success/10 to-success/5 p-3 rounded-[12px]">
              <Activity className="size-6 text-success stroke-[2]" />
            </div>
            <div>
              <CardTitle className="text-2xl tracking-tight">
                Disease Composition
              </CardTitle>
              <CardDescription className="mt-1">
                Distribution of latest diagnosed diseases within each cluster
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {statistics.map((stat, clusterIndex) => {
              const diseases = stat.disease_distribution || {};
              const entries = Object.entries(diseases).sort(
                (a, b) => b[1].count - a[1].count
              );
              const dominantDisease = entries.length > 0 ? entries[0][0] : null;
              const theme =
                CLUSTER_THEMES[clusterIndex % CLUSTER_THEMES.length];

              if (entries.length === 0) {
                return (
                  <div
                    key={stat.cluster_id}
                    className="flex items-center gap-2.5 text-sm text-muted"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.color }}
                    ></div>
                    <span>
                      {dominantDisease
                        ? `${stat.cluster_id + 1}. ${dominantDisease}`
                        : `Cluster ${stat.cluster_id + 1}`}
                      : No diagnoses recorded yet
                    </span>
                  </div>
                );
              }

              return (
                <div key={stat.cluster_id} className="space-y-3">
                  {/* Cluster Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-base-300/50">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: theme.color }}
                      ></div>
                      <span className="font-semibold text-sm text-base-content">
                        {dominantDisease
                          ? `${stat.cluster_id + 1}. ${dominantDisease}`
                          : `Cluster ${stat.cluster_id + 1}`}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-muted bg-base-200/50 px-2.5 py-1 rounded-full">
                      {stat.count} patients
                    </span>
                  </div>

                  {/* Disease Bars */}
                  <div className="space-y-3">
                    {entries.map(([disease, info]) => (
                      <div key={disease} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-base-content">
                            {disease}
                          </span>
                          <span className="text-muted font-medium">
                            {info.count}{" "}
                            <span className="text-muted/60">
                              ({info.percent}%)
                            </span>
                          </span>
                        </div>
                        <div className="w-full bg-base-200/50 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${info.percent}%`,
                              backgroundColor: theme.color,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemographicsCharts;
