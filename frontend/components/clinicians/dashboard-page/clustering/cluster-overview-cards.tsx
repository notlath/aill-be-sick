"use client";
import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Activity, MapPin, Sparkles } from "lucide-react";
import type { ClusterStatistics } from "@/types";

interface ClusterOverviewCardsProps {
  statistics: ClusterStatistics[];
}

const CLUSTER_THEMES = [
  {
    gradient: "from-blue-500/10 to-blue-600/5",
    iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
    shadow: "shadow-blue-500/10",
    accentText: "text-blue-600",
    hoverBorder: "hover:border-blue-300/50",
    border: "border-blue-200/60",
    accentBg: "bg-blue-500/10",
    badgeBg: "bg-blue-500/15 text-blue-700 border-blue-300/40",
  },
  {
    gradient: "from-emerald-500/10 to-emerald-600/5",
    iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    shadow: "shadow-emerald-500/10",
    accentText: "text-emerald-600",
    hoverBorder: "hover:border-emerald-300/50",
    border: "border-emerald-200/60",
    accentBg: "bg-emerald-500/10",
    badgeBg: "bg-emerald-500/15 text-emerald-700 border-emerald-300/40",
  },
  {
    gradient: "from-purple-500/10 to-purple-600/5",
    iconBg: "bg-gradient-to-br from-purple-500 to-purple-600",
    shadow: "shadow-purple-500/10",
    accentText: "text-purple-600",
    hoverBorder: "hover:border-purple-300/50",
    border: "border-purple-200/60",
    accentBg: "bg-purple-500/10",
    badgeBg: "bg-purple-500/15 text-purple-700 border-purple-300/40",
  },
  {
    gradient: "from-orange-500/10 to-orange-600/5",
    iconBg: "bg-gradient-to-br from-orange-500 to-orange-600",
    shadow: "shadow-orange-500/10",
    accentText: "text-orange-600",
    hoverBorder: "hover:border-orange-300/50",
    border: "border-orange-200/60",
    accentBg: "bg-orange-500/10",
    badgeBg: "bg-orange-500/15 text-orange-700 border-orange-300/40",
  },
  {
    gradient: "from-pink-500/10 to-pink-600/5",
    iconBg: "bg-gradient-to-br from-pink-500 to-pink-600",
    shadow: "shadow-pink-500/10",
    accentText: "text-pink-600",
    hoverBorder: "hover:border-pink-300/50",
    border: "border-pink-200/60",
    accentBg: "bg-pink-500/10",
    badgeBg: "bg-pink-500/15 text-pink-700 border-pink-300/40",
  },
  {
    gradient: "from-indigo-500/10 to-indigo-600/5",
    iconBg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    shadow: "shadow-indigo-500/10",
    accentText: "text-indigo-600",
    hoverBorder: "hover:border-indigo-300/50",
    border: "border-indigo-200/60",
    accentBg: "bg-indigo-500/10",
    badgeBg: "bg-indigo-500/15 text-indigo-700 border-indigo-300/40",
  },
  {
    gradient: "from-cyan-500/10 to-cyan-600/5",
    iconBg: "bg-gradient-to-br from-cyan-500 to-cyan-600",
    shadow: "shadow-cyan-500/10",
    accentText: "text-cyan-600",
    hoverBorder: "hover:border-cyan-300/50",
    border: "border-cyan-200/60",
    accentBg: "bg-cyan-500/10",
    badgeBg: "bg-cyan-500/15 text-cyan-700 border-cyan-300/40",
  },
  {
    gradient: "from-rose-500/10 to-rose-600/5",
    iconBg: "bg-gradient-to-br from-rose-500 to-rose-600",
    shadow: "shadow-rose-500/10",
    accentText: "text-rose-600",
    hoverBorder: "hover:border-rose-300/50",
    border: "border-rose-200/60",
    accentBg: "bg-rose-500/10",
    badgeBg: "bg-rose-500/15 text-rose-700 border-rose-300/40",
  },
];

const ClusterOverviewCards: React.FC<ClusterOverviewCardsProps> = ({
  statistics,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {statistics.map((stat, index) => {
        const theme = CLUSTER_THEMES[index % CLUSTER_THEMES.length];
        const totalGender =
          stat.gender_distribution.MALE +
          stat.gender_distribution.FEMALE +
          stat.gender_distribution.OTHER;
        const malePercent =
          totalGender > 0
            ? Math.round((stat.gender_distribution.MALE / totalGender) * 100)
            : 0;
        const femalePercent =
          totalGender > 0
            ? Math.round((stat.gender_distribution.FEMALE / totalGender) * 100)
            : 0;

        // Determine dominant disease from distribution if available
        let dominantDisease: { disease: string; percent: number } | null = null;
        if (stat.disease_distribution) {
          const entries = Object.entries(stat.disease_distribution);
          if (entries.length > 0) {
            const top = entries.sort((a, b) => b[1].percent - a[1].percent)[0];
            dominantDisease = { disease: top[0], percent: top[1].percent };
          }
        }

        return (
          <Card
            key={stat.cluster_id}
            className={`group relative overflow-hidden transition-all duration-500 ${theme.border} ${theme.hoverBorder} hover:shadow-lg border-2`}
          >
            {/* Gradient Background Overlay */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-500`}
            />

            <CardHeader className="relative pb-4">
              {/* Header: Disease Name + Icon */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-muted/60 uppercase tracking-wider mb-1.5">
                    Cluster {stat.cluster_id + 1}
                  </div>
                  <h3 className="text-xl font-semibold text-base-content tracking-tight truncate">
                    {dominantDisease?.disease || "Mixed Cluster"}
                  </h3>
                </div>
                <div
                  className={`flex-shrink-0 ${theme.iconBg} ${theme.shadow} p-3 rounded-[12px] shadow-lg group-hover:scale-110 transition-transform duration-500`}
                >
                  <Activity className="size-5 text-white stroke-[2]" />
                </div>
              </div>

              {/* Patient Count - Large and Prominent */}
              <div className="mt-4 flex items-baseline gap-2">
                <span
                  className={`text-4xl font-semibold tracking-tight ${theme.accentText} tabular-nums`}
                >
                  {stat.count}
                </span>
                <span className="text-sm font-medium text-muted">patients</span>
              </div>
            </CardHeader>

            <CardContent className="relative space-y-5">
              {/* Dominant Disease Badge */}
              {dominantDisease && (
                <div className="flex items-center gap-2 pb-4 border-b border-base-300/50">
                  <Sparkles className={`size-3.5 ${theme.accentText}`} />
                  <span className="text-xs font-medium text-muted">
                    Primary diagnosis
                  </span>
                  <Badge className={`ml-auto border ${theme.badgeBg}`}>
                    {dominantDisease.percent}%
                  </Badge>
                </div>
              )}

              {/* Demographics - Clean Two Column */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className={`size-3.5 ${theme.accentText}`} />
                  <span className="text-xs font-semibold text-base-content/80 uppercase tracking-wide">
                    Demographics
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted">Avg. Age</div>
                    <div className="font-semibold text-base-content">
                      {stat.avg_age} yrs
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted">Male</div>
                    <div className="font-semibold text-base-content">
                      {malePercent}%
                    </div>
                  </div>
                  <div className="col-span-2 space-y-0.5">
                    <div className="text-xs text-muted">Female</div>
                    <div className="font-semibold text-base-content">
                      {femalePercent}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Regions - Pill Badges */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className={`size-3.5 ${theme.accentText}`} />
                  <span className="text-xs font-semibold text-base-content/80 uppercase tracking-wide">
                    Top Regions
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stat.top_regions.slice(0, 2).map((region, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs font-medium"
                    >
                      {region.region} ({region.count})
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Top Diseases */}
              {stat.top_diseases && stat.top_diseases.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-base-content/80 uppercase tracking-wide mb-3">
                    Top Diagnosed
                  </div>
                  <div className="space-y-1.5">
                    {stat.top_diseases.slice(0, 3).map((d, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-base-content/80">
                          {d.disease}
                        </span>
                        <span className="font-semibold text-base-content">
                          ({d.count})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clinical Notes - Minimal Card */}
              <div className="pt-4 border-t border-base-300/50">
                <div
                  className={`${theme.accentBg} rounded-[12px] p-3.5 border ${theme.border}`}
                >
                  <div className="text-[11px] leading-relaxed text-base-content/70">
                    {(() => {
                      const notes = [];

                      // Primary diagnosis summary
                      if (dominantDisease) {
                        notes.push(
                          `Primary diagnosis: ${dominantDisease.disease} (${dominantDisease.percent}% of patients).`
                        );
                      }

                      // Patient count assessment
                      if (stat.count >= 30) {
                        notes.push(
                          `High patient volume (${stat.count} cases).`
                        );
                      } else if (stat.count >= 15) {
                        notes.push(
                          `Moderate patient group (${stat.count} cases).`
                        );
                      }

                      // Geographic concentration
                      if (stat.top_regions && stat.top_regions.length > 0) {
                        const topRegion = stat.top_regions[0];
                        const regionPercent = Math.round(
                          (topRegion.count / stat.count) * 100
                        );
                        if (regionPercent >= 50) {
                          notes.push(
                            `Geographic cluster: ${regionPercent}% in ${topRegion.region}.`
                          );
                        }
                      }

                      return notes.join(" ");
                    })()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ClusterOverviewCards;
