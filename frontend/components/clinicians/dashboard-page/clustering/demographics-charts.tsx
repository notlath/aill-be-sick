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

const CLUSTER_COLORS = ["#3b82f6", "#10b981", "#8b5cf6"];

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5" />
            Age Distribution by Cluster
          </CardTitle>
          <CardDescription>
            Patient age groups across different clusters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
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

              return (
                <div key={stat.cluster_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {dominantDisease
                        ? `${stat.cluster_id + 1}. ${dominantDisease}`
                        : `Cluster ${stat.cluster_id + 1}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Avg: {stat.avg_age} years
                    </span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(ageGroups).map(([range, count]) => {
                      const percentage =
                        maxCount > 0 ? (count / maxCount) * 100 : 0;
                      return (
                        <div key={range} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-12">
                            {range}
                          </span>
                          <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                            <div
                              className="h-full flex items-center justify-end px-2 text-xs font-medium text-white transition-all"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor:
                                  CLUSTER_COLORS[
                                    clusterIndex % CLUSTER_COLORS.length
                                  ],
                                minWidth: count > 0 ? "30px" : "0px",
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="size-5" />
            Gender Distribution by Cluster
          </CardTitle>
          <CardDescription>
            Male/Female ratio across patient clusters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
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

              return (
                <div key={stat.cluster_id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {dominantDisease
                        ? `${stat.cluster_id + 1}. ${dominantDisease}`
                        : `Cluster ${stat.cluster_id + 1}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {stat.count} patients
                    </span>
                  </div>

                  {/* Visual bar */}
                  <div className="flex h-8 rounded-lg overflow-hidden border">
                    {malePercent > 0 && (
                      <div
                        className="bg-blue-500 flex items-center justify-center text-xs font-medium text-white"
                        style={{ width: `${malePercent}%` }}
                      >
                        {malePercent > 15 && `${Math.round(malePercent)}%`}
                      </div>
                    )}
                    {femalePercent > 0 && (
                      <div
                        className="bg-pink-500 flex items-center justify-center text-xs font-medium text-white"
                        style={{ width: `${femalePercent}%` }}
                      >
                        {femalePercent > 15 && `${Math.round(femalePercent)}%`}
                      </div>
                    )}
                    {otherPercent > 0 && (
                      <div
                        className="bg-gray-400 flex items-center justify-center text-xs font-medium text-white"
                        style={{ width: `${otherPercent}%` }}
                      >
                        {otherPercent > 15 && `${Math.round(otherPercent)}%`}
                      </div>
                    )}
                  </div>

                  {/* Legend */}
                  <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                      <span>
                        Male: {stat.gender_distribution.MALE} (
                        {Math.round(malePercent)}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-sm bg-pink-500"></div>
                      <span>
                        Female: {stat.gender_distribution.FEMALE} (
                        {Math.round(femalePercent)}%)
                      </span>
                    </div>
                    {stat.gender_distribution.OTHER > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-gray-400"></div>
                        <span>Other: {stat.gender_distribution.OTHER}</span>
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
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Cluster Size Comparison
          </CardTitle>
          <CardDescription>
            Patient distribution across identified clusters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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

              return (
                <div key={stat.cluster_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor:
                            CLUSTER_COLORS[
                              clusterIndex % CLUSTER_COLORS.length
                            ],
                        }}
                      ></div>
                      <span className="font-medium">
                        {dominantDisease
                          ? `${stat.cluster_id + 1}. ${dominantDisease}`
                          : `Cluster ${stat.cluster_id + 1}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {stat.count} patients
                      </span>
                      <span className="font-semibold text-lg min-w-[60px] text-right">
                        {Math.round(percentage)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor:
                          CLUSTER_COLORS[clusterIndex % CLUSTER_COLORS.length],
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
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5" />
            Disease Composition by Cluster (Latest Diagnosis)
          </CardTitle>
          <CardDescription>
            Distribution of latest diagnosed diseases within each cluster
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {statistics.map((stat, clusterIndex) => {
              const diseases = stat.disease_distribution || {};
              const entries = Object.entries(diseases).sort(
                (a, b) => b[1].count - a[1].count
              );
              const dominantDisease = entries.length > 0 ? entries[0][0] : null;

              if (entries.length === 0) {
                return (
                  <div
                    key={stat.cluster_id}
                    className="text-sm text-muted-foreground"
                  >
                    {dominantDisease
                      ? `${stat.cluster_id + 1}. ${dominantDisease}`
                      : `Cluster ${stat.cluster_id + 1}`}
                    : No diagnoses recorded yet
                  </div>
                );
              }

              return (
                <div key={stat.cluster_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {dominantDisease
                        ? `${stat.cluster_id + 1}. ${dominantDisease}`
                        : `Cluster ${stat.cluster_id + 1}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {stat.count} patients
                    </span>
                  </div>
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
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${info.percent}%`,
                              backgroundColor:
                                CLUSTER_COLORS[
                                  clusterIndex % CLUSTER_COLORS.length
                                ],
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
