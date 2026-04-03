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
    gradient: "from-[#7eb8e0]/10 to-[#6aa8d0]/5",
    iconBg: "bg-gradient-to-br from-[#7eb8e0] to-[#6aa8d0]",
    shadow: "shadow-[#7eb8e0]/10",
    accentText: "text-[#5a98c0]",
    border: "border-[#7eb8e0]/30",
    accentBg: "bg-[#7eb8e0]/10",
    badgeBg: "bg-[#7eb8e0]/15 text-[#5a98c0] border-[#7eb8e0]/20",
  },
  {
    gradient: "from-[#22c55e]/10 to-[#1db353]/5",
    iconBg: "bg-gradient-to-br from-[#22c55e] to-[#1db353]",
    shadow: "shadow-[#22c55e]/10",
    accentText: "text-[#189e48]",
    border: "border-[#22c55e]/30",
    accentBg: "bg-[#22c55e]/10",
    badgeBg: "bg-[#22c55e]/15 text-[#189e48] border-[#22c55e]/20",
  },
  {
    gradient: "from-[#b8a0d8]/10 to-[#a890c8]/5",
    iconBg: "bg-gradient-to-br from-[#b8a0d8] to-[#a890c8]",
    shadow: "shadow-[#b8a0d8]/10",
    accentText: "text-[#9880b8]",
    border: "border-[#b8a0d8]/30",
    accentBg: "bg-[#b8a0d8]/10",
    badgeBg: "bg-[#b8a0d8]/15 text-[#9880b8] border-[#b8a0d8]/20",
  },
  {
    gradient: "from-[#e8b86d]/10 to-[#d8a85d]/5",
    iconBg: "bg-gradient-to-br from-[#e8b86d] to-[#d8a85d]",
    shadow: "shadow-[#e8b86d]/10",
    accentText: "text-[#c8984d]",
    border: "border-[#e8b86d]/30",
    accentBg: "bg-[#e8b86d]/10",
    badgeBg: "bg-[#e8b86d]/15 text-[#c8984d] border-[#e8b86d]/20",
  },
  {
    gradient: "from-[#e8a0b8]/10 to-[#d890a8]/5",
    iconBg: "bg-gradient-to-br from-[#e8a0b8] to-[#d890a8]",
    shadow: "shadow-[#e8a0b8]/10",
    accentText: "text-[#c88098]",
    border: "border-[#e8a0b8]/30",
    accentBg: "bg-[#e8a0b8]/10",
    badgeBg: "bg-[#e8a0b8]/15 text-[#c88098] border-[#e8a0b8]/20",
  },
  {
    gradient: "from-[#90a8d8]/10 to-[#8098c8]/5",
    iconBg: "bg-gradient-to-br from-[#90a8d8] to-[#8098c8]",
    shadow: "shadow-[#90a8d8]/10",
    accentText: "text-[#7088b8]",
    border: "border-[#90a8d8]/30",
    accentBg: "bg-[#90a8d8]/10",
    badgeBg: "bg-[#90a8d8]/15 text-[#7088b8] border-[#90a8d8]/20",
  },
  {
    gradient: "from-[#7ec8c8]/10 to-[#6eb8b8]/5",
    iconBg: "bg-gradient-to-br from-[#7ec8c8] to-[#6eb8b8]",
    shadow: "shadow-[#7ec8c8]/10",
    accentText: "text-[#5ea8a8]",
    border: "border-[#7ec8c8]/30",
    accentBg: "bg-[#7ec8c8]/10",
    badgeBg: "bg-[#7ec8c8]/15 text-[#5ea8a8] border-[#7ec8c8]/20",
  },
  {
    gradient: "from-[#e8706a]/10 to-[#d8605a]/5",
    iconBg: "bg-gradient-to-br from-[#e8706a] to-[#d8605a]",
    shadow: "shadow-[#e8706a]/10",
    accentText: "text-[#c8504a]",
    border: "border-[#e8706a]/30",
    accentBg: "bg-[#e8706a]/10",
    badgeBg: "bg-[#e8706a]/15 text-[#c8504a] border-[#e8706a]/20",
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

        // Determine dominant disease phrase from distribution
        let dominantDisease: {
          disease: string;
          phrase: "have" | "primarily have";
        } | null = null;
        if (stat.disease_distribution) {
          const entries = Object.entries(stat.disease_distribution);
          if (entries.length > 0) {
            const sorted = entries.sort((a, b) => b[1].count - a[1].count);
            const topDisease = sorted[0];

            if (sorted.length === 1) {
              dominantDisease = {
                disease: topDisease[0],
                phrase: "have",
              };
            } else {
              const secondDisease = sorted[1];
              if (secondDisease[1].count > 0) {
                const percentageIncrease =
                  (topDisease[1].count - secondDisease[1].count) /
                  secondDisease[1].count;

                if (percentageIncrease >= 0.4) {
                  dominantDisease = {
                    disease: topDisease[0],
                    phrase: "primarily have",
                  };
                }
              } else if (topDisease[1].count > 0) {
                dominantDisease = {
                  disease: topDisease[0],
                  phrase: "primarily have",
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
                                  , {dominantDisease.phrase}{" "}
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
                            className={`swap swap-rotate ${
                              expandedClusters[`${stat.cluster_id}-diseases`]
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
                            className={`swap swap-rotate ${
                              expandedClusters[stat.cluster_id]
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
                            className={`swap swap-rotate ${
                              expandedClusters[`${stat.cluster_id}-regions`]
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
