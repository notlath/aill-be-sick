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
import { MapPin, Navigation } from "lucide-react";
import type { ClusterStatistics, Patient } from "@/types/clustering";

interface GeographicDistributionProps {
  statistics: ClusterStatistics[];
  patients: Patient[];
}

const CLUSTER_COLORS = ["#3b82f6", "#10b981", "#8b5cf6"];

const GeographicDistribution: React.FC<GeographicDistributionProps> = ({
  statistics,
  patients,
}) => {
  // Get all unique regions
  const allRegions = Array.from(
    new Set(patients.map((p) => p.region).filter(Boolean))
  ).sort();

  // Calculate region distribution per cluster
  const getRegionDistribution = (clusterPatients: Patient[]) => {
    const distribution: { [key: string]: number } = {};
    clusterPatients.forEach((p) => {
      if (p.region) {
        distribution[p.region] = (distribution[p.region] || 0) + 1;
      }
    });
    return distribution;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Regional Distribution by Cluster */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-5" />
            Regional Distribution Matrix
          </CardTitle>
          <CardDescription>
            Patient distribution across Philippine regions by cluster
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Region</th>
                  {statistics.map((stat, idx) => {
                    const dist = stat.disease_distribution || {};
                    const entries = Object.entries(dist).sort(
                      (a, b) => b[1].percent - a[1].percent
                    );
                    const dominantDisease =
                      entries.length > 0 ? entries[0][0] : null;
                    return (
                      <th
                        key={stat.cluster_id}
                        className="text-center py-3 px-4"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className="w-4 h-4 rounded"
                            style={{
                              backgroundColor:
                                CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
                            }}
                          ></div>
                          <span className="font-semibold">
                            {dominantDisease
                              ? `${stat.cluster_id + 1}. ${dominantDisease}`
                              : `Cluster ${stat.cluster_id + 1}`}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="text-center py-3 px-4 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {allRegions.map((region) => {
                  const regionTotal = patients.filter(
                    (p) => p.region === region
                  ).length;

                  return (
                    <tr key={region} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Navigation className="size-3 text-muted-foreground" />
                          <span className="font-medium">{region}</span>
                        </div>
                      </td>
                      {statistics.map((stat, idx) => {
                        const clusterPatients = patients.filter(
                          (p) => p.cluster === stat.cluster_id
                        );
                        const regionCount = clusterPatients.filter(
                          (p) => p.region === region
                        ).length;
                        const percentage =
                          stat.count > 0
                            ? Math.round((regionCount / stat.count) * 100)
                            : 0;

                        return (
                          <td
                            key={stat.cluster_id}
                            className="text-center py-3 px-4"
                          >
                            {regionCount > 0 ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-semibold">
                                  {regionCount}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({percentage}%)
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center py-3 px-4">
                        <span className="font-bold">{regionTotal}</span>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-muted/30 font-semibold">
                  <td className="py-3 px-4">Total</td>
                  {statistics.map((stat) => (
                    <td key={stat.cluster_id} className="text-center py-3 px-4">
                      {stat.count}
                    </td>
                  ))}
                  <td className="text-center py-3 px-4">{patients.length}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Cities per Cluster */}
      {statistics.map((stat, clusterIndex) => {
        const dist = stat.disease_distribution || {};
        const entries = Object.entries(dist).sort(
          (a, b) => b[1].percent - a[1].percent
        );
        const dominantDisease = entries.length > 0 ? entries[0][0] : null;
        return (
          <Card key={stat.cluster_id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{
                    backgroundColor:
                      CLUSTER_COLORS[clusterIndex % CLUSTER_COLORS.length],
                  }}
                ></div>
                {dominantDisease
                  ? `${stat.cluster_id + 1}. ${dominantDisease}`
                  : `Cluster ${stat.cluster_id + 1}`}{" "}
                - Geographic Hotspots
              </CardTitle>
              <CardDescription>
                Top cities with highest patient concentration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Top Cities */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="size-4" />
                    Top Cities
                  </h4>
                  <div className="space-y-2">
                    {stat.top_cities.slice(0, 5).map((city, idx) => {
                      const percentage =
                        stat.count > 0 ? (city.count / stat.count) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{city.city}</span>
                            <span className="text-muted-foreground">
                              {city.count} ({Math.round(percentage)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor:
                                  CLUSTER_COLORS[
                                    clusterIndex % CLUSTER_COLORS.length
                                  ],
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Regions */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Navigation className="size-4" />
                    Top Regions
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {stat.top_regions.map((region, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        {region.region}
                        <span className="font-bold ml-1">({region.count})</span>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Clinical Insight */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Clinical Insight:</span>{" "}
                    This cluster shows concentration in{" "}
                    {stat.top_cities[0]?.city || "urban areas"}.
                    {stat.count > 30 &&
                      " High patient density suggests potential for community-level health interventions."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default GeographicDistribution;
