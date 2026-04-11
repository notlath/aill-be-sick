"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  HeartPulse,
  MapPin,
  Users,
  AlertCircle,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Heart,
  Tag,
} from "lucide-react";
import type { IllnessClusterStatistics, IllnessRecord } from "@/types";
import {
  DEFAULT_CLUSTER_VARIABLES,
  type ClusterVariableSelection,
} from "@/types/illness-cluster-settings";
import {
  buildIllnessClusterMapHref,
  type IllnessClusterMapNavigationContext,
} from "@/utils/illness-cluster-navigation";
import { getThemeForDisease } from "@/constants/cluster-themes";
import EndemicBadge from "../endemic-badge";

interface IllnessClusterOverviewCardsProps {
  statistics: IllnessClusterStatistics[];
  illnesses: IllnessRecord[];
  selectedVariables?: ClusterVariableSelection;
  mapNavigationContext?: IllnessClusterMapNavigationContext;
}

type RankedGroupStat = {
  stat: IllnessClusterStatistics;
  rankIndex: number;
};

const getAgeSummary = (stat: IllnessClusterStatistics): string => {
  const ageValue = stat.median_patient_age ?? stat.avg_patient_age;

  if (ageValue >= 60) {
    return "mostly older adults";
  }

  if (ageValue >= 36) {
    return "mostly middle-aged adults";
  }

  if (ageValue >= 18) {
    return "mostly young adults";
  }

  if (ageValue >= 13) {
    return "mostly adolescents";
  }

  return "mostly children";
};

const getTopDiseaseText = (stat: IllnessClusterStatistics): string | null => {
  if (!stat.top_diseases || stat.top_diseases.length === 0) {
    return null;
  }

  const topDisease = stat.top_diseases[0];
  return `${topDisease.disease} (${topDisease.count})`;
};

const getTopDistrictText = (
  stat: IllnessClusterStatistics,
  selectedVariables: ClusterVariableSelection,
): string | null => {
  if (!selectedVariables.district || !stat.top_districts?.length) {
    return null;
  }

  return stat.top_districts[0]?.district ?? null;
};

const getTemporalTrend = (
  temporalDistribution: Record<string, number> | undefined,
): { direction: "up" | "down" | "stable"; percentage: number; label: string } | null => {
  if (!temporalDistribution || Object.keys(temporalDistribution).length < 2) {
    return null;
  }

  const sortedEntries = Object.entries(temporalDistribution).sort((a, b) => a[0].localeCompare(b[0]));
  const midPoint = Math.floor(sortedEntries.length / 2);
  
  const firstHalf = sortedEntries.slice(0, midPoint);
  const secondHalf = sortedEntries.slice(midPoint);
  
  const firstHalfTotal = firstHalf.reduce((sum, [, count]) => sum + count, 0);
  const secondHalfTotal = secondHalf.reduce((sum, [, count]) => sum + count, 0);
  
  if (firstHalfTotal === 0 && secondHalfTotal === 0) {
    return null;
  }

  const percentChange = firstHalfTotal > 0 
    ? ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100 
    : secondHalfTotal > 0 ? 100 : 0;

  if (Math.abs(percentChange) < 10) {
    return { direction: "stable", percentage: Math.abs(percentChange), label: "Steady" };
  } else if (percentChange > 0) {
    return { direction: "up", percentage: Math.round(percentChange), label: "Up" };
  } else {
    return { direction: "down", percentage: Math.round(Math.abs(percentChange)), label: "Down" };
  }
};

const IllnessClusterOverviewCards: React.FC<
  IllnessClusterOverviewCardsProps
> = ({
  statistics,
  selectedVariables = DEFAULT_CLUSTER_VARIABLES,
  mapNavigationContext,
}) => {
  const router = useRouter();
  const [expandedGroups, setExpandedGroups] = React.useState<
    Record<string, boolean>
  >({});

  const [showOtherGroups, setShowOtherGroups] = React.useState(false);

  const { topGroups, remainingGroups } = React.useMemo(() => {
    const ranked = [...statistics]
      .sort((a, b) => b.count - a.count)
      .map<RankedGroupStat>((stat, rankIndex) => ({ stat, rankIndex }));

    return {
      topGroups: ranked.slice(0, 5),
      remainingGroups: ranked.slice(5),
    };
  }, [statistics]);

  const otherGroupsSummary = React.useMemo(() => {
    const groupCount = remainingGroups.length;
    const diagnosisCount = remainingGroups.reduce(
      (total, item) => total + item.stat.count,
      0,
    );

    return {
      groupCount,
      diagnosisCount,
    };
  }, [remainingGroups]);

  const renderGroupCard = ({ stat, rankIndex }: RankedGroupStat) => {
    const topDiseaseText = getTopDiseaseText(stat);
    const topDiseaseName = stat.top_diseases?.[0]?.disease;
    const theme = getThemeForDisease(topDiseaseName, rankIndex);
    const mapHref = buildIllnessClusterMapHref(rankIndex + 1, {
      ...mapNavigationContext,
      variables: mapNavigationContext?.variables ?? selectedVariables,
    });

    const topDistrictText = getTopDistrictText(stat, selectedVariables);
    const ageSummary = getAgeSummary(stat);
    const isVulnerable =
      ageSummary === "mostly older adults" || ageSummary === "mostly children";
    const detailKey = `${stat.cluster_id}-details`;
    const isDetailsOpen = expandedGroups[detailKey] || false;
    const temporalTrend = getTemporalTrend(stat.temporal_distribution);
    const clinicalLabel = stat.clinical_label || `Group ${rankIndex + 1}`;
    const clinicalInsight = stat.clinical_insight || "";
    const riskAssessment = stat.risk_assessment || "LOW";
    const recommendations = stat.recommendations || [];

    return (
      <Card
        key={stat.cluster_id}
        className={`overflow-hidden border-2 shadow-sm! transition-all duration-200 hover:border-opacity-100 hover:shadow-md! ${theme.border}`}
      >
        <CardHeader className="space-y-3 pb-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold">{clinicalLabel}</div>
              <Badge variant="outline" className="text-[11px]">
                {stat.count} diagnoses
              </Badge>
            </div>
            {riskAssessment === "HIGH" && (
              <Badge variant="destructive" className="animate-pulse text-[10px]">
                <AlertCircle className="size-3 mr-1" />
                HIGH RISK
              </Badge>
            )}
            {riskAssessment === "MEDIUM" && (
              <Badge variant="secondary" className="text-[10px]">
                Medium Risk
              </Badge>
            )}

            <div className="flex gap-2 mt-1">
              <button
                type="button"
                className={`btn btn-sm flex-1 border-0 ${theme.badgeBg}`}
                title="Generate Report"
                disabled
              >
                <FileText className="size-3.5 mr-1" /> Report
              </button>
              <button
                type="button"
                className={`btn btn-sm flex-1 border-0 ${theme.badgeBg}`}
                onClick={(event) => {
                  event.stopPropagation();
                  router.push(mapHref);
                }}
              >
                <MapPin className="size-3.5 mr-1" /> Map
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div
              className={`rounded-[12px] border p-3 text-xs leading-relaxed text-base-content/75 space-y-2 ${theme.border} ${theme.accentBg}`}
            >
              <div>
                Group primarily includes{" "}
                <span
                  className={`font-bold ${isVulnerable ? "text-error bg-error/10 px-2 py-0.5 rounded flex items-center gap-1.5 inline-flex" : "text-base-content font-semibold"}`}
                >
                  {isVulnerable && <AlertCircle className="size-3" />}
                  {ageSummary}
                </span>
                .
              </div>

              {topDistrictText ||
              (selectedVariables.time &&
                stat.temporal_distribution &&
                Object.keys(stat.temporal_distribution).length > 0) ? (
                <div className="flex flex-col gap-1.5 pt-1.5 border-t border-black/5 dark:border-white/5">
                  {topDistrictText && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3" />
                      <span>
                        Top area: <strong>{topDistrictText}</strong>
                      </span>
                    </div>
                  )}

                  {selectedVariables.time &&
                    stat.temporal_distribution &&
                    Object.keys(stat.temporal_distribution).length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3" />
                        {temporalTrend ? (
                          <span className="flex items-center gap-1.5">
                            <span className={`flex items-center gap-0.5 font-semibold ${
                              temporalTrend.direction === "up" ? `${theme.accentText}` :
                              temporalTrend.direction === "down" ? `${theme.accentText}` :
                              "text-base-content/70"
                            }`}>
                              {temporalTrend.direction === "up" ? (
                                <TrendingUp className="size-3" />
                              ) : temporalTrend.direction === "down" ? (
                                <TrendingDown className="size-3" />
                              ) : (
                                <Minus className="size-3" />
                              )}
                              {temporalTrend.label} {temporalTrend.percentage}%
                            </span>
                            <span className="text-base-content/50 text-xs">
                              ({Object.keys(stat.temporal_distribution).length} months)
                            </span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 flex-wrap">
                            {Object.entries(stat.temporal_distribution)
                              .sort((a, b) => a[0].localeCompare(b[0]))
                              .slice(0, 3)
                              .map(([month, count]) => (
                                <span
                                  key={`${stat.cluster_id}-header-${month}`}
                                  className="font-semibold"
                                >
                                  {month} ({count})
                                </span>
                              ))}
                          </span>
                        )}
                      </div>
                    )}
                </div>
              ) : null}

              {clinicalInsight && (
                <div className={`pt-1.5 border-t border-black/5 dark:border-white/5 font-medium ${theme.accentText}`}>
                  {clinicalInsight}
                </div>
              )}

              {topDiseaseText && (
                <div className="pt-1.5 border-t border-black/5 dark:border-white/5">
                  Most common illness: <strong>{topDiseaseText}</strong>
                </div>
              )}

              {recommendations.length > 0 && (
                <div className={`rounded-lg ${theme.accentBg} p-3 space-y-2`}>
                  <div className={`text-xs font-semibold flex items-center gap-1.5 ${theme.accentText}`}>
                    <AlertCircle className="size-3.5" />
                    Recommended Actions
                  </div>
                  <ul className="text-xs space-y-1.5">
                    {recommendations.slice(0, 3).map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-base-content/80">
                        <span className={`${theme.accentText} font-medium`}>•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="collapse rounded-none">
            <input
              type="checkbox"
              checked={isDetailsOpen}
              onChange={(event) => {
                event.stopPropagation();
                setExpandedGroups((previous) => ({
                  ...previous,
                  [detailKey]: event.target.checked,
                }));
              }}
            />
            <div
              className="collapse-title px-0 py-1 text-xs font-semibold text-base-content/75"
              onClick={(event) => event.stopPropagation()}
            >
              More details
            </div>
            <div className="collapse-content space-y-4 px-0 pt-2 text-xs">
              {stat.top_diseases?.length ? (
                <div>
                  <div className="mb-2 flex items-center gap-2 font-semibold text-base-content/80">
                    <HeartPulse className={`size-3.5 ${theme.accentText}`} />
                    Illness Breakdown
                  </div>
                  <div className="space-y-1.5">
                    {stat.top_diseases.map((diseaseItem, diseaseIndex) => {
                      const percentage = stat.count > 0
                        ? Math.round((diseaseItem.count / stat.count) * 100)
                        : 0;
                      return (
                        <div
                          key={`${stat.cluster_id}-disease-${diseaseIndex}`}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="flex items-center gap-1.5 text-base-content/80">
                            {diseaseItem.disease}
                            <EndemicBadge
                              disease={diseaseItem.disease}
                              size="sm"
                            />
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-base-content">
                              {diseaseItem.count}
                            </span>
                            <span className="text-base-content/60 text-xs">
                              ({percentage}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {stat.top_districts && stat.top_districts.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2 font-semibold text-base-content/80">
                    <MapPin className={`size-3.5 ${theme.accentText}`} />
                    Area Distribution (Bagong Silangan)
                  </div>
                  <div className="space-y-1.5">
                    {stat.top_districts.map((district, idx) => {
                      const percentage = Math.round((district.count / stat.count) * 100);
                      return (
                        <div key={idx} className="flex items-center justify-between gap-2">
                          <span className="text-base-content/80">{district.district}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-base-content">{district.count}</span>
                            <span className="text-base-content/60 text-xs">({percentage}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {stat.avg_symptom_severity != null && (
                <div>
                  <div className="mb-2 flex items-center gap-2 font-semibold text-base-content/80">
                    <Activity className={`size-3.5 ${theme.accentText}`} />
                    Symptom Severity
                  </div>
                  <div className="rounded-lg border border-base-300 p-2">
                    <div className="font-semibold text-base-content">
                      {stat.avg_symptom_severity.toFixed(1)}
                      <span className="text-base-content/60 text-sm ml-1">
                        {stat.avg_symptom_severity >= 7 ? "(High)" : stat.avg_symptom_severity >= 4 ? "(Medium)" : "(Low)"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {stat.avg_comorbidities_count != null && (
                <div>
                  <div className="mb-2 flex items-center gap-2 font-semibold text-base-content/80">
                    <Heart className={`size-3.5 ${theme.accentText}`} />
                    Comorbidities
                  </div>
                  <div className="rounded-lg border border-base-300 p-2">
                    <div className="font-semibold text-base-content">
                      {stat.avg_comorbidities_count.toFixed(1)} avg
                    </div>
                    <div className="text-xs text-base-content/60">
                      {stat.avg_comorbidities_count > 1 ? "High comorbidity rate" : stat.avg_comorbidities_count > 0.5 ? "Moderate" : "Mostly healthy patients"}
                    </div>
                  </div>
                </div>
              )}

              {stat.insight_tags && stat.insight_tags.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2 font-semibold text-base-content/80">
                    <Tag className={`size-3.5 ${theme.accentText}`} />
                    Quick Insights
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {stat.insight_tags.map((tag, idx) => (
                      <span key={idx} className={`badge badge-sm ${theme.badgeBg}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center gap-2 font-semibold text-base-content/80">
                  <Users className={`size-3.5 ${theme.accentText}`} />
                  Demographics
                </div>
                <div className="rounded-lg border border-base-300 p-2 space-y-2">
                  {stat.gender_distribution && Object.keys(stat.gender_distribution).length > 0 && (
                    <div>
                      <div className="text-base-content/60 text-xs">Gender</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {Object.entries(stat.gender_distribution).map(([gender, count]) => (
                          <span key={gender} className="text-sm">
                            <span className="capitalize font-medium">{gender}: </span>
                            <span className="text-base-content/80">{count} ({Math.round((count / stat.count) * 100)}%)</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-base-content/60 text-xs">Total Cases</div>
                    <div className="font-semibold">{stat.count}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {topGroups.map(renderGroupCard)}

      {otherGroupsSummary.groupCount > 0 ? (
        <Card className="border-base-300 border-2 bg-base-100/70 shadow-sm!">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold">Other groups</div>
              <button
                type="button"
                className="btn btn-outline btn-xs"
                onClick={() =>
                  setShowOtherGroups((previousState) => !previousState)
                }
              >
                {showOtherGroups ? "Hide" : "Show"}
              </button>
            </div>
            <div className="rounded-[12px] border border-base-300 bg-base-200/60 p-3 text-xs text-base-content/75">
              {otherGroupsSummary.groupCount} additional groups contain a total
              of <strong>{otherGroupsSummary.diagnosisCount}</strong> diagnosis
              records.
            </div>
          </CardHeader>
        </Card>
      ) : null}

      {showOtherGroups ? remainingGroups.map(renderGroupCard) : null}
    </div>
  );
};

export default IllnessClusterOverviewCards;
