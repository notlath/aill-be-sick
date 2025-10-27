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
import type { ClusterStatistics } from "@/types/clustering";

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5" />
            Cluster × Disease Matrix
          </CardTitle>
          <CardDescription>
            Counts of latest diagnoses by disease across clusters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Disease</th>
                  {statistics.map((s, i) => {
                    const dist = s.disease_distribution || {};
                    const entries = Object.entries(dist).sort(
                      (a, b) => b[1].percent - a[1].percent
                    );
                    const dominantDisease =
                      entries.length > 0 ? entries[0][0] : null;
                    return (
                      <th key={s.cluster_id} className="text-center py-3 px-4">
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className="w-4 h-4 rounded"
                            style={{
                              backgroundColor:
                                CLUSTER_COLORS[i % CLUSTER_COLORS.length],
                            }}
                          ></div>
                          <span className="font-semibold">
                            {dominantDisease
                              ? `${s.cluster_id + 1}. ${dominantDisease}`
                              : `Cluster ${s.cluster_id + 1}`}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="text-center py-3 px-4 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {allDiseases.map((d) => {
                  const rowTotal = statistics.reduce(
                    (sum, s) => sum + (s.disease_distribution?.[d]?.count || 0),
                    0
                  );
                  return (
                    <tr key={d} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className="text-xs">
                          {d}
                        </Badge>
                      </td>
                      {statistics.map((s) => {
                        const info = s.disease_distribution?.[d];
                        return (
                          <td
                            key={s.cluster_id}
                            className="text-center py-3 px-4"
                          >
                            {info ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-semibold">
                                  {info.count}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({info.percent}%)
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center py-3 px-4">
                        <span className="font-bold">{rowTotal}</span>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-muted/30 font-semibold">
                  <td className="py-3 px-4">Total</td>
                  {statistics.map((s) => (
                    <td key={s.cluster_id} className="text-center py-3 px-4">
                      {s.count}
                    </td>
                  ))}
                  <td className="text-center py-3 px-4">
                    {statistics.reduce((sum, s) => sum + s.count, 0)}
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
