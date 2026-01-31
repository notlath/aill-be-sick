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
import { MapPin, Navigation, Globe2 } from "lucide-react";
import type { ClusterStatistics, Patient } from "@/types";

interface GeographicDistributionProps {
  statistics: ClusterStatistics[];
  patients: Patient[];
}

// Visual themes per cluster (8-color system)
const CLUSTER_GRADIENTS = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-purple-500 to-purple-600",
  "from-orange-500 to-orange-600",
  "from-pink-500 to-pink-600",
  "from-indigo-500 to-indigo-600",
  "from-cyan-500 to-cyan-600",
  "from-rose-500 to-rose-600",
];
const CLUSTER_DOTS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-cyan-500",
  "bg-rose-500",
];

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
      <Card className="lg:col-span-2 group hover:border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-3 rounded-[12px]">
              <Globe2 className="size-6 text-primary stroke-[2]" />
            </div>
            <div>
              <CardTitle className="text-2xl tracking-tight">
                Regional Distribution Matrix
              </CardTitle>
              <CardDescription className="mt-1">
                Patient distribution across Philippine regions by cluster
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
                    Region
                  </th>
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
                        className="text-center py-4 px-4 border-b-2 border-base-300/50 min-w-[140px]"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-[10px] bg-gradient-to-br ${
                              CLUSTER_GRADIENTS[idx % CLUSTER_GRADIENTS.length]
                            } shadow-sm`}
                          ></div>
                          <div className="text-xs font-semibold text-muted/70 uppercase tracking-wider">
                            {stat.cluster_id + 1}. {dominantDisease || "Mixed"}
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
                {allRegions.map((region) => {
                  const regionTotal = patients.filter(
                    (p) => p.region === region
                  ).length;
                  return (
                    <tr
                      key={region}
                      className="group/row hover:bg-base-200/30 transition-colors duration-200"
                    >
                      <td className="sticky left-0 z-10 bg-white/80 backdrop-blur-sm group-hover/row:bg-base-200/50 transition-colors duration-200 py-4 px-5 border-b border-base-300/30">
                        <div className="flex items-center gap-2">
                          <Navigation className="size-4 text-muted" />
                          <span className="font-medium text-base-content">
                            {region}
                          </span>
                        </div>
                      </td>
                      {statistics.map((stat) => {
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
                            className="text-center py-4 px-4 border-b border-base-300/30"
                          >
                            {regionCount > 0 ? (
                              <div className="inline-flex flex-col items-center gap-1 min-w-[60px]">
                                <span className="text-base font-semibold text-base-content/80 tabular-nums">
                                  {regionCount}
                                </span>
                                <span className="text-[10px] font-medium text-muted/60">
                                  {percentage}%
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
                          {regionTotal}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gradient-to-br from-base-200/50 to-base-200/30 font-semibold">
                  <td className="sticky left-0 z-10 bg-gradient-to-br from-base-200/80 to-base-200/60 backdrop-blur-sm py-4 px-5 text-sm uppercase tracking-wide text-base-content/80 rounded-bl-[12px]">
                    Total
                  </td>
                  {statistics.map((stat) => (
                    <td
                      key={stat.cluster_id}
                      className="text-center py-4 px-4 text-base"
                    >
                      <span className="font-semibold text-base-content/80 tabular-nums">
                        {stat.count}
                      </span>
                    </td>
                  ))}
                  <td className="text-center py-4 px-5 rounded-br-[12px]">
                    <span className="text-lg font-bold text-primary tabular-nums">
                      {patients.length}
                    </span>
                  </td>
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
          <Card key={stat.cluster_id} className="group hover:border-primary/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-3 rounded-[12px]">
                  <MapPin className="size-6 text-primary stroke-[2]" />
                </div>
                <div>
                  <CardTitle className="text-xl tracking-tight flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        CLUSTER_DOTS[clusterIndex % CLUSTER_DOTS.length]
                      }`}
                    ></span>
                    {dominantDisease
                      ? `${stat.cluster_id + 1}. ${dominantDisease}`
                      : `Cluster ${stat.cluster_id + 1}`}{" "}
                    — Geographic Hotspots
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Top cities with highest patient concentration
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {/* Top Cities */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-base-content/80 uppercase tracking-wide">
                    <MapPin className="size-4 text-muted" />
                    Top Cities
                  </h4>
                  <div className="space-y-3">
                    {stat.top_cities.slice(0, 5).map((city, idx) => {
                      const percentage =
                        stat.count > 0 ? (city.count / stat.count) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-base-content">
                              {city.city}
                            </span>
                            <span className="text-muted">
                              {city.count} ({Math.round(percentage)}%)
                            </span>
                          </div>
                          <div className="w-full bg-base-200/60 rounded-full h-2">
                            <div
                              className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                                CLUSTER_GRADIENTS[
                                  clusterIndex % CLUSTER_GRADIENTS.length
                                ]
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Regions */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-base-content/80 uppercase tracking-wide">
                    <Navigation className="size-4 text-muted" />
                    Top Regions
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {stat.top_regions.map((region, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="gap-1 text-xs"
                      >
                        {region.region}
                        <span className="font-bold ml-1">({region.count})</span>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Clinical Insight */}
                <div className="mt-2 p-3.5 rounded-[12px] border border-primary/20 bg-primary/5">
                  <p className="text-sm text-primary/90">
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
