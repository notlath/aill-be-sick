"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Heart, MapPin, TrendingUp } from "lucide-react";
import type { ClusterStatistics } from "@/types/clustering";

interface ClusterOverviewCardsProps {
  statistics: ClusterStatistics[];
}

const CLUSTER_COLORS = [
  {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    icon: "bg-blue-100",
  },
  {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    icon: "bg-green-100",
  },
  {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    icon: "bg-purple-100",
  },
];

const ClusterOverviewCards: React.FC<ClusterOverviewCardsProps> = ({
  statistics,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statistics.map((stat, index) => {
        const colors = CLUSTER_COLORS[index % CLUSTER_COLORS.length];
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
            className={`${colors.border} border-2 ${colors.bg}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-lg ${colors.text}`}>
                  {dominantDisease?.disease
                    ? `${stat.cluster_id + 1}. ${dominantDisease.disease}`
                    : `Cluster ${stat.cluster_id + 1}`}
                </CardTitle>
                <div className={`${colors.icon} p-2 rounded-full`}>
                  <Users className={`size-5 ${colors.text}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Patient Count */}
              <div>
                <div className={`text-3xl font-bold ${colors.text}`}>
                  {stat.count}
                </div>
                <div className="text-sm text-muted-foreground">patients</div>
              </div>

              {/* Highlight Dominant Disease */}
              {dominantDisease && (
                <div className="space-y-1">
                  <div className="text-sm font-medium">Dominant Disease</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {dominantDisease.disease}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {dominantDisease.percent}% of cluster
                    </span>
                  </div>
                </div>
              )}

              {/* Demographics */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Heart className={`size-4 ${colors.text}`} />
                  <span className="text-sm font-medium">Demographics</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg. Age:</span>
                    <span className="font-semibold">{stat.avg_age} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Male:</span>
                    <span className="font-semibold">{malePercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Female:</span>
                    <span className="font-semibold">{femalePercent}%</span>
                  </div>
                </div>
              </div>

              {/* Top Locations */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className={`size-4 ${colors.text}`} />
                  <span className="text-sm font-medium">Top Regions</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {stat.top_regions.slice(0, 2).map((region, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {region.region} ({region.count})
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Top Diseases (Latest Diagnoses) */}
              {stat.top_diseases && stat.top_diseases.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className={`size-4 ${colors.text}`} />
                    <span className="text-sm font-medium">
                      Top Diagnosed Diseases
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {stat.top_diseases.slice(0, 3).map((d, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {d.disease} ({d.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Clinical Insights */}
              <div
                className={`${colors.bg} border ${colors.border} rounded-lg p-3 mt-4`}
              >
                <div className="flex items-start gap-2">
                  <TrendingUp className={`size-4 ${colors.text} mt-0.5`} />
                  <div className="text-xs">
                    <div className="font-medium mb-1">Clinical Notes:</div>
                    <div className="text-muted-foreground leading-relaxed">
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
                            `High patient volume (${stat.count} cases) - priority monitoring recommended.`
                          );
                        } else if (stat.count >= 15) {
                          notes.push(
                            `Moderate patient group (${stat.count} cases).`
                          );
                        } else {
                          notes.push(
                            `Small patient cohort (${stat.count} cases).`
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
                              `Geographic cluster detected: ${regionPercent}% concentrated in ${topRegion.region}.`
                            );
                          } else {
                            notes.push(
                              `Most common in ${topRegion.region} region.`
                            );
                          }
                        }

                        // Age demographic insights
                        if (stat.avg_age < 18) {
                          notes.push(
                            "Pediatric population - consider age-appropriate protocols."
                          );
                        } else if (stat.avg_age >= 65) {
                          notes.push(
                            "Elderly population - monitor for complications."
                          );
                        }

                        // Gender distribution insights
                        const totalGender =
                          stat.gender_distribution.MALE +
                          stat.gender_distribution.FEMALE +
                          stat.gender_distribution.OTHER;
                        const malePercent =
                          totalGender > 0
                            ? Math.round(
                                (stat.gender_distribution.MALE / totalGender) *
                                  100
                              )
                            : 0;

                        if (malePercent >= 75) {
                          notes.push("Predominantly male patients.");
                        } else if (malePercent <= 25) {
                          notes.push("Predominantly female patients.");
                        }

                        return notes.join(" ");
                      })()}
                    </div>
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
