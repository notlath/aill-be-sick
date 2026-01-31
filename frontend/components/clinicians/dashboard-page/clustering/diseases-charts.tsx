"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, BarChart3 } from "lucide-react";
import type { ClusterStatistics } from "@/types";

interface DiseasesChartsProps {
  statistics: ClusterStatistics[];
}

const CLUSTER_COLORS = ["#3b82f6", "#10b981", "#8b5cf6"]; // blue, green, purple

const DiseasesCharts: React.FC<DiseasesChartsProps> = ({ statistics }) => {
  // Collect the set of all diseases across clusters for a stable display order
  const diseaseSet = new Set<string>();
  statistics.forEach((s) => {
    const dist = s.disease_distribution || {};
    Object.keys(dist).forEach((k) => diseaseSet.add(k));
  });
  const allDiseases = Array.from(diseaseSet);

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Per-cluster disease bars */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5" />
            Disease Composition per Cluster
          </CardTitle>
          <CardDescription>
            The proportion of latest diagnosed diseases within each cluster
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {statistics.map((stat, idx) => {
              const dist = stat.disease_distribution || {};
              const entries = Object.entries(dist).sort(
                (a, b) => b[1].percent - a[1].percent
              );
              const dominantDisease = entries.length > 0 ? entries[0][0] : null;
              return (
                <div key={stat.cluster_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor:
                            CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
                        }}
                      ></div>
                      <span className="font-medium">
                        {dominantDisease
                          ? `${stat.cluster_id + 1}. ${dominantDisease}`
                          : `Cluster ${stat.cluster_id + 1}`}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {stat.count} patients
                    </span>
                  </div>
                  {entries.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No diagnoses recorded for this cluster
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {entries.map(([disease, info]) => (
                        <div key={disease} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{disease}</span>
                            <span className="text-muted-foreground">
                              {info.count} ({info.percent}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${info.percent}%`,
                                backgroundColor:
                                  CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cluster x Disease matrix */}
      <Card className="group hover:border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-3 rounded-[12px]">
              <BarChart3 className="size-6 text-primary stroke-[2]" />
            </div>
            <div>
              <CardTitle className="text-2xl tracking-tight">
                Cluster × Disease Matrix
              </CardTitle>
              <CardDescription className="mt-1">
                Distribution of diagnosed diseases across patient clusters
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-8 px-8">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-white/80 backdrop-blur-sm text-left py-4 px-5 font-semibold text-sm text-base-content/80 uppercase tracking-wide border-b-2 border-base-300/50">
                    Disease
                  </th>
                  {statistics.map((s, i) => {
                    const dist = s.disease_distribution || {};
                    const entries = Object.entries(dist).sort(
                      (a, b) => b[1].percent - a[1].percent
                    );
                    const dominantDisease =
                      entries.length > 0 ? entries[0][0] : null;
                    const colors = [
                      "from-blue-500 to-blue-600",
                      "from-emerald-500 to-emerald-600",
                      "from-purple-500 to-purple-600",
                      "from-orange-500 to-orange-600",
                      "from-pink-500 to-pink-600",
                      "from-indigo-500 to-indigo-600",
                      "from-cyan-500 to-cyan-600",
                      "from-rose-500 to-rose-600",
                    ];
                    return (
                      <th
                        key={s.cluster_id}
                        className="text-center py-4 px-4 border-b-2 border-base-300/50 min-w-[120px]"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-[10px] bg-gradient-to-br ${
                              colors[i % colors.length]
                            } shadow-sm`}
                          ></div>
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-muted/70 uppercase tracking-wider">
                              {s.cluster_id + 1}. {dominantDisease || "Mixed"}
                            </div>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                  <th className="text-center py-4 px-5 font-semibold text-sm text-base-content/80 uppercase tracking-wide border-b-2 border-base-300/50">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {allDiseases.map((d, diseaseIdx) => {
                  const rowTotal = statistics.reduce(
                    (sum, s) => sum + (s.disease_distribution?.[d]?.count || 0),
                    0
                  );
                  return (
                    <tr
                      key={d}
                      className="group/row hover:bg-base-200/30 transition-colors duration-200"
                    >
                      <td className="sticky left-0 z-10 bg-white/80 backdrop-blur-sm group-hover/row:bg-base-200/50 transition-colors duration-200 py-4 px-5 border-b border-base-300/30">
                        <Badge
                          variant="outline"
                          className="text-sm font-medium"
                        >
                          {d}
                        </Badge>
                      </td>
                      {statistics.map((s) => {
                        const info = s.disease_distribution?.[d];
                        return (
                          <td
                            key={s.cluster_id}
                            className="text-center py-4 px-4 border-b border-base-300/30"
                          >
                            {info ? (
                              <div className="inline-flex flex-col items-center gap-1 min-w-[60px]">
                                <span className="text-base font-semibold text-base-content/80 tabular-nums">
                                  {info.count}
                                </span>
                                <span className="text-[10px] font-medium text-muted/60">
                                  {info.percent}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-base text-muted/20 font-light">
                                –
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center py-4 px-5 border-b border-base-300/30">
                        <span className="text-base font-bold text-base-content/90 tabular-nums">
                          {rowTotal}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gradient-to-br from-base-200/50 to-base-200/30 font-semibold">
                  <td className="sticky left-0 z-10 bg-gradient-to-br from-base-200/80 to-base-200/60 backdrop-blur-sm py-4 px-5 text-sm uppercase tracking-wide text-base-content/80 rounded-bl-[12px]">
                    Total
                  </td>
                  {statistics.map((s) => (
                    <td
                      key={s.cluster_id}
                      className="text-center py-4 px-4 text-base"
                    >
                      <span className="font-semibold text-base-content/80 tabular-nums">
                        {s.count}
                      </span>
                    </td>
                  ))}
                  <td className="text-center py-4 px-5 rounded-br-[12px]">
                    <span className="text-lg font-bold text-primary tabular-nums">
                      {statistics.reduce((sum, s) => sum + s.count, 0)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DiseasesCharts;
