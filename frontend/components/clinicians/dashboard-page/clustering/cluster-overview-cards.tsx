"use client";
import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, HeartPulse } from "lucide-react";
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
    border: "border-blue-200/60",
    accentBg: "bg-blue-500/10",
    badgeBg: "bg-blue-500/15 text-blue-700 border-blue-300/40",
  },
  {
    gradient: "from-emerald-500/10 to-emerald-600/5",
    iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    shadow: "shadow-emerald-500/10",
    accentText: "text-emerald-600",
    border: "border-emerald-200/60",
    accentBg: "bg-emerald-500/10",
    badgeBg: "bg-emerald-500/15 text-emerald-700 border-emerald-300/40",
  },
  {
    gradient: "from-purple-500/10 to-purple-600/5",
    iconBg: "bg-gradient-to-br from-purple-500 to-purple-600",
    shadow: "shadow-purple-500/10",
    accentText: "text-purple-600",
    border: "border-purple-200/60",
    accentBg: "bg-purple-500/10",
    badgeBg: "bg-purple-500/15 text-purple-700 border-purple-300/40",
  },
  {
    gradient: "from-orange-500/10 to-orange-600/5",
    iconBg: "bg-gradient-to-br from-orange-500 to-orange-600",
    shadow: "shadow-orange-500/10",
    accentText: "text-orange-600",
    border: "border-orange-200/60",
    accentBg: "bg-orange-500/10",
    badgeBg: "bg-orange-500/15 text-orange-700 border-orange-300/40",
  },
  {
    gradient: "from-pink-500/10 to-pink-600/5",
    iconBg: "bg-gradient-to-br from-pink-500 to-pink-600",
    shadow: "shadow-pink-500/10",
    accentText: "text-pink-600",
    border: "border-pink-200/60",
    accentBg: "bg-pink-500/10",
    badgeBg: "bg-pink-500/15 text-pink-700 border-pink-300/40",
  },
  {
    gradient: "from-indigo-500/10 to-indigo-600/5",
    iconBg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    shadow: "shadow-indigo-500/10",
    accentText: "text-indigo-600",
    border: "border-indigo-200/60",
    accentBg: "bg-indigo-500/10",
    badgeBg: "bg-indigo-500/15 text-indigo-700 border-indigo-300/40",
  },
  {
    gradient: "from-cyan-500/10 to-cyan-600/5",
    iconBg: "bg-gradient-to-br from-cyan-500 to-cyan-600",
    shadow: "shadow-cyan-500/10",
    accentText: "text-cyan-600",
    border: "border-cyan-200/60",
    accentBg: "bg-cyan-500/10",
    badgeBg: "bg-cyan-500/15 text-cyan-700 border-cyan-300/40",
  },
  {
    gradient: "from-rose-500/10 to-rose-600/5",
    iconBg: "bg-gradient-to-br from-rose-500 to-rose-600",
    shadow: "shadow-rose-500/10",
    accentText: "text-rose-600",
    border: "border-rose-200/60",
    accentBg: "bg-rose-500/10",
    badgeBg: "bg-rose-500/15 text-rose-700 border-rose-300/40",
  },
];

// Helper function to check if cluster has dominant disease (40% higher than second)
const hasDominantDisease = (stat: ClusterStatistics): boolean => {
  if (!stat.disease_distribution) return false;

  const entries = Object.entries(stat.disease_distribution);
  if (entries.length <= 1) return true; // Single disease is always dominant

  // Optimization: use toSorted for immutability and no side-effects on original array
  const sorted = entries.toSorted((a, b) => b[1].count - a[1].count);
  const topDisease = sorted[0];
  const secondDisease = sorted[1];
  const percentageIncrease =
    (topDisease[1].count - secondDisease[1].count) / secondDisease[1].count;

  return percentageIncrease >= 0.4;
};

const ClusterOverviewCards: React.FC<ClusterOverviewCardsProps> = ({
  statistics,
}) => {
  const [expandedClusters, setExpandedClusters] = React.useState<
    Record<string, boolean>
  >({});

  // Sort clusters: dominant disease first, then by patient count (descending)
  // Memoized to prevent re-sorting on every render
  const sortedStatistics = React.useMemo(() => {
    return [...statistics].sort((a, b) => {
      const aDominant = hasDominantDisease(a);
      const bDominant = hasDominantDisease(b);

      // Prioritize clusters with dominant disease
      if (aDominant && !bDominant) return -1;
      if (!aDominant && bDominant) return 1;

      // Then sort by patient count
      return b.count - a.count;
    });
  }, [statistics]);

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sortedStatistics.map((stat, index) => {
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
        // Only show if top disease is at least 40% higher than second disease
        let dominantDisease: { disease: string; percent: number } | null = null;
        if (stat.disease_distribution) {
          const entries = Object.entries(stat.disease_distribution);
          if (entries.length > 0) {
            const sorted = entries.sort((a, b) => b[1].count - a[1].count);
            const topDisease = sorted[0];

            if (sorted.length === 1) {
              // Only one disease, show it
              dominantDisease = {
                disease: topDisease[0],
                percent: topDisease[1].percent,
              };
            } else {
              // Check if top disease is at least 40% higher than second
              const secondDisease = sorted[1];
              const percentageIncrease =
                (topDisease[1].count - secondDisease[1].count) /
                secondDisease[1].count;

              if (percentageIncrease >= 0.4) {
                dominantDisease = {
                  disease: topDisease[0],
                  percent: topDisease[1].percent,
                };
              }
            }
          }
        }

        return (
          <Card
            key={stat.cluster_id}
            className={`group relative overflow-hidden transition-all duration-500 ${theme.border} border-2 `}
          >
            {/* Gradient Background Overlay */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-60 transition-opacity duration-500 `}
            />

            <CardHeader className="relative pb-4">
              {/* Header: Disease Name */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 font-semibold">Group {index + 1}</div>
                  {/* Clinical Notes - Minimal Card */}
                  <div className="">
                    <div
                      className={`${theme.accentBg} rounded-[12px] border p-3.5 ${theme.border}`}
                    >
                      <div className="text-base-content/70 text-xs leading-relaxed">
                        {(() => {
                          // Age descriptor
                          let ageDescriptor = "patients";
                          if (stat.avg_age >= 60) {
                            ageDescriptor = "predominantly older adults";
                          } else if (stat.avg_age >= 36) {
                            ageDescriptor = "predominantly middle-aged adults";
                          } else if (stat.avg_age >= 18) {
                            ageDescriptor = "predominantly young adults";
                          } else if (stat.avg_age >= 13) {
                            ageDescriptor = "predominantly adolescents";
                          } else {
                            ageDescriptor = "predominantly children";
                          }

                          // Region or City
                          let regionLocation = "";
                          let regionPrefix = "from"; // "from" or "mostly from"

                          if (stat.top_cities && stat.top_cities.length === 1) {
                            // Only one city, display "from {city}"
                            regionLocation = stat.top_cities[0].city;
                            regionPrefix = "from";
                          } else if (
                            stat.top_regions &&
                            stat.top_regions.length === 1
                          ) {
                            // Only one region, display "from {region}"
                            regionLocation = stat.top_regions[0].region;
                            regionPrefix = "from";
                          } else if (
                            stat.top_regions &&
                            stat.top_regions.length >= 2
                          ) {
                            // Two or more regions
                            const topRegion = stat.top_regions[0];
                            const secondRegion = stat.top_regions[1];
                            const percentageIncrease =
                              (topRegion.count - secondRegion.count) /
                              secondRegion.count;

                            if (percentageIncrease >= 0.4) {
                              // Top region is 40% higher, display "mostly from {region}"
                              regionLocation = topRegion.region;
                              regionPrefix = "mostly from";
                            }
                            // Otherwise, don't mention region at all
                          }

                          // Gender descriptor
                          let genderDescriptor = "";
                          let genderWord = "";
                          if (malePercent >= 60) {
                            genderDescriptor = "mostly";
                            genderWord = "male";
                          } else if (femalePercent >= 60) {
                            genderDescriptor = "mostly";
                            genderWord = "female";
                          }

                          return (
                            <>
                              {stat.count} patients
                              {regionLocation ? (
                                <>
                                  {" "}
                                  {regionPrefix}{" "}
                                  <strong>{regionLocation}</strong>
                                </>
                              ) : null}
                              , {ageDescriptor}
                              {genderWord ? (
                                <>
                                  , {genderDescriptor}{" "}
                                  <strong>{genderWord}</strong>
                                </>
                              ) : null}
                              {dominantDisease ? (
                                <>
                                  , has mostly{" "}
                                  <strong>{dominantDisease.disease}</strong>
                                </>
                              ) : null}
                              .
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Count - Large and Prominent */}
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-4xl font-semibold tracking-tight ${theme.accentText} tabular-nums`}
                >
                  {stat.count}
                </span>
                <span className="text-muted text-sm font-medium">patients</span>
              </div>
            </CardHeader>

            <CardContent className="relative space-y-5">
              {/* Top Diseases */}
              {stat.top_diseases && stat.top_diseases.length > 0 ? (
                <div>
                  {stat.top_diseases.length <= 5 ? (
                    // No collapse needed - show all diseases
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <HeartPulse
                          className={`size-3.5 ${theme.accentText}`}
                        />
                        <div className="text-base-content/80 text-xs font-semibold">
                          Top Diagnosed Diseases ({stat.top_diseases.length})
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {stat.top_diseases.map((d, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-base-content/80">
                              {d.disease}
                            </span>
                            <span className="text-base-content font-semibold">
                              ({d.count})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // Show collapse with first 5 and rest
                    <div className="collapse rounded-none">
                      <input
                        type="checkbox"
                        checked={
                          expandedClusters[`${stat.cluster_id}-diseases`] ||
                          false
                        }
                        onChange={(e) =>
                          setExpandedClusters({
                            ...expandedClusters,
                            [`${stat.cluster_id}-diseases`]: e.target.checked,
                          })
                        }
                      />
                      <div className="collapse-title p-0">
                        <div className="text-base-content/80 mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <HeartPulse
                              className={`size-3.5 ${theme.accentText}`}
                            />
                            <span className="text-xs font-semibold">
                              Top Diagnosed Diseases ({stat.top_diseases.length}
                              )
                            </span>
                          </div>
                          <span
                            className={`swap swap-rotate ${expandedClusters[`${stat.cluster_id}-diseases`]
                              ? "swap-active"
                              : ""
                              }`}
                          >
                            <div
                              className={`swap-on ${theme.accentText} ${theme.badgeBg} size-4.5 flex items-center justify-center rounded-full`}
                            >
                              -
                            </div>
                            <div
                              className={`swap-off ${theme.accentText} ${theme.badgeBg} size-4.5 flex items-center justify-center rounded-full`}
                            >
                              +
                            </div>
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {stat.top_diseases.slice(0, 5).map((d, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-base-content/80">
                                {d.disease}
                              </span>
                              <span className="text-base-content font-semibold">
                                ({d.count})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="collapse-content mt-1.5 p-0">
                        <div className="space-y-1.5">
                          {stat.top_diseases.slice(5).map((d, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-base-content/80">
                                {d.disease}
                              </span>
                              <span className="text-base-content font-semibold">
                                ({d.count})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Demographics - Clean Two Column */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Users className={`size-3.5 ${theme.accentText}`} />
                  <span className="text-base-content/80 text-xs font-semibold">
                    Demographics
                  </span>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="grid grid-cols-3 gap-x-4 gap-y-2.5 text-sm">
                    <div className="space-y-0.5">
                      <div className="text-muted text-xs">Avg. Age</div>
                      <div className="text-base-content text-sm font-semibold">
                        {stat.avg_age} yrs
                      </div>
                      <div className="text-muted text-xs font-normal">
                        ({stat.min_age}-{stat.max_age})
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-muted text-xs">Male</div>
                      <div className="text-base-content font-semibold">
                        {malePercent}%
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-muted text-xs">Female</div>
                      <div className="text-base-content font-semibold">
                        {femalePercent}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Cities - Pill Badges */}
              {stat.top_cities && stat.top_cities.length > 0 ? (
                <div>
                  {stat.top_cities.length <= 5 ? (
                    // No collapse needed - show all cities
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <MapPin className={`size-3.5 ${theme.accentText}`} />
                        <span className="text-base-content/80 text-xs font-semibold tracking-wide">
                          Top Cities ({stat.top_cities.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {stat.top_cities.map((city, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-xs font-medium"
                          >
                            {city.city} ({city.count})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // Show collapse with first 5 and rest
                    <div className="collapse rounded-none">
                      <input
                        type="checkbox"
                        checked={expandedClusters[stat.cluster_id] || false}
                        onChange={(e) =>
                          setExpandedClusters({
                            ...expandedClusters,
                            [stat.cluster_id]: e.target.checked,
                          })
                        }
                      />
                      <div className="collapse-title p-0">
                        <div className="text-base-content/80 mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin
                              className={`size-3.5 ${theme.accentText}`}
                            />
                            <span className="text-xs font-semibold">
                              Top Cities ({stat.top_cities.length})
                            </span>
                          </div>
                          <span
                            className={`swap swap-rotate ${expandedClusters[stat.cluster_id]
                              ? "swap-active"
                              : ""
                              }`}
                          >
                            <div
                              className={`swap-on ${theme.accentText} ${theme.badgeBg} size-4.5 flex items-center justify-center rounded-full`}
                            >
                              -
                            </div>
                            <div
                              className={`swap-off ${theme.accentText} ${theme.badgeBg} size-4.5 flex items-center justify-center rounded-full`}
                            >
                              +
                            </div>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {stat.top_cities.slice(0, 5).map((city, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs font-medium"
                            >
                              {city.city} ({city.count})
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="collapse-content mt-1.5 p-0">
                        <div className="flex flex-wrap gap-1.5">
                          {stat.top_cities.slice(5).map((city, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs font-medium"
                            >
                              {city.city} ({city.count})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Top Regions - Pill Badges */}
              {stat.top_regions && stat.top_regions.length > 0 ? (
                <div>
                  {stat.top_regions.length <= 5 ? (
                    // No collapse needed - show all regions
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <MapPin className={`size-3.5 ${theme.accentText}`} />
                        <span className="text-base-content/80 text-xs font-semibold tracking-wide">
                          Top Regions ({stat.top_regions.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {stat.top_regions.map((region, idx) => (
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
                  ) : (
                    // Show collapse with first 5 and rest
                    <div className="collapse rounded-none">
                      <input
                        type="checkbox"
                        checked={
                          expandedClusters[`${stat.cluster_id}-regions`] ||
                          false
                        }
                        onChange={(e) =>
                          setExpandedClusters({
                            ...expandedClusters,
                            [`${stat.cluster_id}-regions`]: e.target.checked,
                          })
                        }
                      />
                      <div className="collapse-title p-0">
                        <div className="text-base-content/80 mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin
                              className={`size-3.5 ${theme.accentText}`}
                            />
                            <span className="text-xs font-semibold">
                              Top Regions ({stat.top_regions.length})
                            </span>
                          </div>
                          <span
                            className={`swap swap-rotate ${expandedClusters[`${stat.cluster_id}-regions`]
                              ? "swap-active"
                              : ""
                              }`}
                          >
                            <div
                              className={`swap-on ${theme.accentText} ${theme.badgeBg} size-4.5 flex items-center justify-center rounded-full`}
                            >
                              -
                            </div>
                            <div
                              className={`swap-off ${theme.accentText} ${theme.badgeBg} size-4.5 flex items-center justify-center rounded-full`}
                            >
                              +
                            </div>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {stat.top_regions.slice(0, 5).map((region, idx) => (
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
                      <div className="collapse-content mt-1.5 p-0">
                        <div className="flex flex-wrap gap-1.5">
                          {stat.top_regions.slice(5).map((region, idx) => (
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
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ClusterOverviewCards;
