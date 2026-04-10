"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, HeartPulse, MapPin, Users } from "lucide-react";
import type { IllnessClusterStatistics, IllnessRecord } from "@/types";
import {
  DEFAULT_CLUSTER_VARIABLES,
  type ClusterVariableSelection,
} from "@/types/illness-cluster-settings";
import {
  buildIllnessClusterMapHref,
  type IllnessClusterMapNavigationContext,
} from "@/utils/illness-cluster-navigation";
import { CLUSTER_THEMES } from "@/constants/cluster-themes";
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
    const theme = CLUSTER_THEMES[rankIndex % CLUSTER_THEMES.length];
    const mapHref = buildIllnessClusterMapHref(rankIndex + 1, {
      ...mapNavigationContext,
      variables: mapNavigationContext?.variables ?? selectedVariables,
    });

    const topDiseaseText = getTopDiseaseText(stat);
    const topDistrictText = getTopDistrictText(stat, selectedVariables);
    const ageSummary = getAgeSummary(stat);
    const detailKey = `${stat.cluster_id}-details`;
    const isDetailsOpen = expandedGroups[detailKey] || false;

    return (
      <Card
        key={stat.cluster_id}
        className={`overflow-hidden border-2 shadow-sm! transition-all duration-200 hover:border-opacity-100 hover:shadow-md! ${theme.border}`}
      >
        <CardHeader className="space-y-3 pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold">Group {rankIndex + 1}</div>
            <Badge variant="outline" className="text-[11px]">
              {stat.count} diagnoses
            </Badge>
          </div>

          <div
            className={`rounded-[12px] border p-3 text-xs leading-relaxed text-base-content/75 ${theme.border} ${theme.accentBg}`}
          >
            This group includes {ageSummary}
            {topDistrictText ? (
              <>
                , mostly from <strong>{topDistrictText}</strong>
              </>
            ) : null}
            {topDiseaseText ? (
              <>
                . Most common illness: <strong>{topDiseaseText}</strong>
              </>
            ) : null}
            .
          </div>

          <button
            type="button"
            className={`btn btn-xs w-fit border-0 ${theme.badgeBg}`}
            onClick={(event) => {
              event.stopPropagation();
              router.push(mapHref);
            }}
          >
            Open group on map
          </button>
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
                    Illnesses
                  </div>
                  <div className="space-y-1.5">
                    {stat.top_diseases
                      .slice(0, 6)
                      .map((diseaseItem, diseaseIndex) => (
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
                          <span className="font-semibold text-base-content">
                            {diseaseItem.count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}

              <div>
                <div className="mb-2 flex items-center gap-2 font-semibold text-base-content/80">
                  <Users className={`size-3.5 ${theme.accentText}`} />
                  Patient details
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-base-300 p-2">
                    <div className="text-base-content/60">Median age</div>
                    <div className="font-semibold text-base-content">
                      {Math.round(
                        stat.median_patient_age ?? stat.avg_patient_age,
                      )}{" "}
                      years
                    </div>
                  </div>
                  <div className="rounded-lg border border-base-300 p-2">
                    <div className="text-base-content/60">Age range</div>
                    <div className="font-semibold text-base-content">
                      {stat.min_patient_age} - {stat.max_patient_age} years
                    </div>
                  </div>
                </div>
              </div>

              {selectedVariables.district && stat.top_districts?.length ? (
                <div>
                  <div className="mb-2 flex items-center gap-2 font-semibold text-base-content/80">
                    <MapPin className={`size-3.5 ${theme.accentText}`} />
                    Districts
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {stat.top_districts
                      .slice(0, 8)
                      .map((district, districtIndex) => (
                        <Badge
                          key={`${stat.cluster_id}-district-${districtIndex}`}
                          variant="outline"
                          className="text-xs"
                        >
                          {district.district} ({district.count})
                        </Badge>
                      ))}
                  </div>
                </div>
              ) : null}

              {selectedVariables.time &&
              stat.temporal_distribution &&
              Object.keys(stat.temporal_distribution).length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center gap-2 font-semibold text-base-content/80">
                    <Calendar className={`size-3.5 ${theme.accentText}`} />
                    Time trend
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(stat.temporal_distribution)
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .slice(0, 6)
                      .map(([month, count]) => (
                        <Badge
                          key={`${stat.cluster_id}-${month}`}
                          variant="outline"
                          className="text-xs"
                        >
                          {month} ({count})
                        </Badge>
                      ))}
                  </div>
                </div>
              ) : null}
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
