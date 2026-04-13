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

type AgeSummary = {
  label: string;
  range: string;
};

const getAgeSummary = (stat: IllnessClusterStatistics): AgeSummary => {
  const ageValue = stat.median_patient_age ?? stat.avg_patient_age;

  if (ageValue >= 60) {
    return { label: "Older adults", range: "60+" };
  }

  if (ageValue >= 36) {
    return { label: "Adults", range: "36-59" };
  }

  if (ageValue >= 18) {
    return { label: "Young adults", range: "18-35" };
  }

  if (ageValue >= 13) {
    return { label: "Adolescents", range: "13-17" };
  }

  return { label: "Children", range: "0-12" };
};

const MAX_TOP_DISEASES_QUICK_LOOK = 3;

const getTopDiseasesText = (stat: IllnessClusterStatistics): string | null => {
  if (!stat.top_diseases || stat.top_diseases.length === 0) {
    return null;
  }

  const topDiseases = stat.top_diseases.slice(0, MAX_TOP_DISEASES_QUICK_LOOK);
  return topDiseases
    .map((disease) => `${disease.disease} (${disease.count})`)
    .join(" · ");
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

type TrendInfo = {
  direction: "critical-rise" | "increasing" | "stable" | "decreasing" | "critical-drop";
  arrow: string;
  label: string;
  months: number;
};

const getTemporalTrend = (
  temporalDistribution: Record<string, number> | undefined,
): TrendInfo | null => {
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

  const months = Object.keys(temporalDistribution).length;

  if (percentChange > 50) {
    return { direction: "critical-rise", arrow: "↑", label: "Rising", months };
  } else if (percentChange > 20) {
    return { direction: "increasing", arrow: "↗", label: "Increasing", months };
  } else if (percentChange < -50) {
    return { direction: "critical-drop", arrow: "↓", label: "Dropping", months };
  } else if (percentChange < -20) {
    return { direction: "decreasing", arrow: "↘", label: "Decreasing", months };
  } else {
    return { direction: "stable", arrow: "→", label: "Stable", months };
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
    const topDiseasesText = getTopDiseasesText(stat);
    const topDiseaseName = stat.top_diseases?.[0]?.disease;
    const theme = getThemeForDisease(topDiseaseName, rankIndex);
    const mapHref = buildIllnessClusterMapHref(rankIndex + 1, {
      ...mapNavigationContext,
      variables: mapNavigationContext?.variables ?? selectedVariables,
    });

    const topDistrictText = getTopDistrictText(stat, selectedVariables);
    const ageSummary = getAgeSummary(stat);
    const isVulnerable =
      ageSummary.label === "Older adults" || ageSummary.label === "Children";
    const detailKey = `${stat.cluster_id}-details`;
    const isDetailsOpen = expandedGroups[detailKey] || false;
    const temporalTrend = getTemporalTrend(stat.temporal_distribution);
    const clinicalLabel = stat.clinical_label || `Group ${rankIndex + 1}`;
    const clinicalInsight = stat.clinical_insight || "";
    const riskAssessment = stat.risk_assessment || "LOW";
    const recommendations = stat.recommendations || [];
    const clinicalInsightTooLong = clinicalInsight.length > 150;

    return (
      <Card
        key={stat.cluster_id}
        className={`overflow-hidden border-2 shadow-sm! transition-all duration-200 hover:border-opacity-100 hover:shadow-md! ${theme.border}`}
      >
        <CardHeader className="space-y-3 pb-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-lg font-bold">{clinicalLabel}</div>
              <Badge variant="outline" className="text-[11px] font-semibold">
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
              <Badge variant="secondary" className="animate-pulse text-[10px]">
                Medium Risk
              </Badge>
            )}

            <div className="flex gap-2 mt-1">
              {/*
              <button
                type="button"
                className={`btn btn-sm flex-1 border-0 ${theme.badgeBg}`}
                title="Generate Report"
                disabled
              >
                <FileText className="size-3.5 mr-1" /> Report
              </button>
              */}
              <button
                type="button"
                className={`btn btn-sm flex-1 border-0 ${theme.badgeBg}`}
                onClick={(event) => {
                  event.stopPropagation();
                  router.push(mapHref);
                }}
              >
                <MapPin className="size-3.5 mr-1" /> View Map
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div
              className={`rounded-[12px] border p-3 text-xs leading-relaxed text-base-content/60 space-y-2 ${theme.border} ${theme.accentBg}`}
            >
              <div className="flex items-center gap-2 flex-wrap text-base-content/70">
                <span>Age:</span>
                <span
                  className={`${isVulnerable ? "text-error bg-error/10 px-2 py-0.5 rounded flex items-center gap-1.5 inline-flex font-semibold" : "font-medium text-base-content/80"}`}
                >
                  {isVulnerable && <AlertCircle className="size-3" />}
                  {ageSummary.label} ({ageSummary.range})
                </span>
              </div>

              {topDistrictText ||
              (selectedVariables.time &&
                stat.temporal_distribution &&
                Object.keys(stat.temporal_distribution).length > 0) ? (
                <div className="flex flex-col gap-1.5 pt-1.5 border-t border-black/5 dark:border-white/5">
                  {topDistrictText && (
                    <div className="flex items-center gap-1.5 text-base-content/70">
                      <MapPin className="size-3 text-base-content/50" />
                      <span>
                        Top area: <span className="font-medium text-base-content/90">{topDistrictText}</span>
                      </span>
                    </div>
                  )}

                  {selectedVariables.time &&
                    stat.temporal_distribution &&
                    Object.keys(stat.temporal_distribution).length > 0 && (
                      <div className="flex items-center gap-1.5 text-base-content/70">
                        <Calendar className="size-3 text-base-content/50" />
                        {temporalTrend ? (
                          <span className="flex items-center gap-1.5">
                            <span className={`flex items-center gap-0.5 font-medium ${
                              temporalTrend.direction === "critical-rise" || temporalTrend.direction === "critical-drop" || temporalTrend.direction === "increasing" || temporalTrend.direction === "decreasing"
                                ? `${theme.accentText}`
                                : "text-base-content/70"
                            }`}>
                              {temporalTrend.arrow} {temporalTrend.label}
                            </span>
                            <span className="text-base-content/50 text-xs">
                              {temporalTrend.months}mo trend
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
                                  className="font-medium text-base-content/80"
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

              {clinicalInsight && !clinicalInsightTooLong && (
                <div className={`pt-1.5 border-t border-black/5 dark:border-white/5 font-medium ${theme.accentText}`}>
                  {clinicalInsight}
                </div>
              )}

              {topDiseasesText && (
                <div className="pt-1.5 border-t border-black/5 dark:border-white/5">
                  <div className="font-medium text-base-content/70 mb-1.5">Diseases</div>
                  <div className="space-y-1 text-xs">
                    {stat.top_diseases.slice(0, 3).map((d, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="font-medium text-base-content/90 capitalize">{d.disease}</span>
                        <span className="text-base-content/80 tabular-nums">{d.count}</span>
                      </div>
                    ))}
                  </div>
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
                    Symptom severity
                  </div>
                  <div className="rounded-lg border border-base-300 p-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base-content tabular-nums">
                        {stat.avg_symptom_severity.toFixed(1)}
                      </span>
                      <span className="text-base-content/60 text-xs">
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
                    Other conditions
                  </div>
                  <div className="rounded-lg border border-base-300 p-2">
                    <div className="text-xs text-base-content/60 mb-1">
                      {stat.avg_comorbidities_count > 1 ? "High comorbidity rate" : stat.avg_comorbidities_count > 0.5 ? "Moderate" : "Mostly healthy patients"}
                    </div>
                    <span className="font-semibold text-base-content tabular-nums">
                      {stat.avg_comorbidities_count.toFixed(1)} avg
                    </span>
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
                  Gender
                </div>
                <div className="rounded-lg border border-base-300 p-2 space-y-1">
                  {stat.gender_distribution && Object.keys(stat.gender_distribution).length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {Object.entries(stat.gender_distribution).map(([gender, count]) => (
                        <span key={gender} className="text-xs">
                          <span className="capitalize font-medium text-base-content/70">{gender.toLowerCase()}</span>
                          <span className="text-base-content/80 ml-1">{Math.round((count / stat.count) * 100)}%</span>
                        </span>
                      ))}
                    </div>
                  )}
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
