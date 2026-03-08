"use client";
import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, HeartPulse, Calendar } from "lucide-react";
import type { IllnessClusterStatistics, IllnessRecord } from "@/types";
import PatientsModal from "@/components/clinicians/map-page/patients-modal";

interface IllnessClusterOverviewCardsProps {
  statistics: IllnessClusterStatistics[];
  illnesses: IllnessRecord[];
  selectedVariables?: {
    age: boolean;
    gender: boolean;
    district: boolean;
    time: boolean;
  };
}

import { CLUSTER_THEMES } from "../../../../constants/cluster-themes";

const IllnessClusterOverviewCards: React.FC<
  IllnessClusterOverviewCardsProps
> = ({
  statistics,
  illnesses,
  selectedVariables = {
    age: true,
    gender: true,
    district: true,
    time: false,
  },
}) => {
    const [expandedClusters, setExpandedClusters] = React.useState<
      Record<string, boolean>
    >({});
    const [selectedClusterId, setSelectedClusterId] = React.useState<number | null>(
      null,
    );
    const [selectedClusterDisplay, setSelectedClusterDisplay] = React.useState("");

    const sortedStatistics = React.useMemo(() => {
      return [...statistics].sort((a, b) => {
        // Sort by patient count descending
        return b.count - a.count;
      });
    }, [statistics]);

    const selectedClusterPatients = React.useMemo(() => {
      if (selectedClusterId === null) {
        return [];
      }

      return illnesses.filter((illness) => illness.cluster === selectedClusterId);
    }, [illnesses, selectedClusterId]);

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
          const otherPercent =
            totalGender > 0
              ? Math.round((stat.gender_distribution.OTHER / totalGender) * 100)
              : 0;

          // Determine dominant disease from distribution
          let dominantDisease: { disease: string; percent: number } | null = null;
          if (stat.disease_distribution) {
            const entries = Object.entries(stat.disease_distribution);
            if (entries.length > 0) {
              const sorted = entries.sort((a, b) => b[1].count - a[1].count);
              const topDisease = sorted[0];

              if (sorted.length === 1) {
                dominantDisease = {
                  disease: topDisease[0],
                  percent: topDisease[1].percent,
                };
              } else {
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
              className={`relative overflow-hidden shadow-sm! transition-none! ${theme.border} border-2 `}
            >
              {/* Gradient Background Overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-60 `}
              />

              <CardHeader className="relative pb-4">
                {/* Header: Cluster Name */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="font-semibold">Group {index + 1}</div>
                      <button
                        type="button"
                        className="btn btn-xs btn-outline border-border"
                        onClick={() => {
                          setSelectedClusterId(stat.cluster_id);
                          setSelectedClusterDisplay(String(index + 1));
                        }}
                      >
                        View patients
                      </button>
                    </div>
                    {/* Clinical Notes - Minimal Card */}
                    <div className="">
                      <div
                        className={`${theme.accentBg} rounded-[12px] border p-3.5 ${theme.border}`}
                      >
                        <div className="text-base-content/70 text-xs leading-relaxed">
                          {(() => {
                            // Age descriptor
                            let ageDescriptor = "patients";
                            if (stat.avg_patient_age >= 60) {
                              ageDescriptor = "predominantly older adults";
                            } else if (stat.avg_patient_age >= 36) {
                              ageDescriptor = "predominantly middle-aged adults";
                            } else if (stat.avg_patient_age >= 18) {
                              ageDescriptor = "predominantly young adults";
                            } else if (stat.avg_patient_age >= 13) {
                              ageDescriptor = "predominantly adolescents";
                            } else {
                              ageDescriptor = "predominantly children";
                            }

                            // District - respect selected variables
                            let regionLocation = "";
                            let regionPrefix = "from";
                            let hasMultipleDistricts = false;

                            if (
                              selectedVariables.district &&
                              stat.top_districts &&
                              stat.top_districts.length >= 1
                            ) {
                              const topDistrict = stat.top_districts[0];
                              regionLocation = topDistrict.district;
                              regionPrefix = "from";
                              hasMultipleDistricts = stat.top_districts.length > 1;

                              if (stat.top_districts.length >= 2) {
                                const secondDistrict = stat.top_districts[1];
                                const percentageIncrease =
                                  (topDistrict.count - secondDistrict.count) /
                                  secondDistrict.count;

                                if (percentageIncrease >= 0.4) {
                                  regionPrefix = "mostly from";
                                }
                              }
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
                                {stat.count} diagnoses
                                {regionLocation ? (
                                  <>
                                    {" "}
                                    {hasMultipleDistricts
                                      ? "primarily"
                                      : regionPrefix}{" "}
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
                                    , primarily{" "}
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

                {/* Diagnosis Count - Large and Prominent */}
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-4xl font-semibold tracking-tight ${theme.accentText} tabular-nums`}
                  >
                    {stat.count}
                  </span>
                  <span className="text-muted text-sm font-medium">
                    diagnoses
                  </span>
                </div>
              </CardHeader>

              <CardContent className="relative space-y-5">
                {/* Top Diseases */}
                {stat.top_diseases && stat.top_diseases.length > 0 ? (
                  <div>
                    {stat.top_diseases.length <= 5 ? (
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <HeartPulse
                            className={`size-3.5 ${theme.accentText}`}
                          />
                          <div className="text-base-content/80 text-xs font-semibold">
                            Diseases ({stat.top_diseases.length})
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
                                Diseases ({stat.top_diseases.length})
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
                      Patient Demographics
                    </span>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="grid grid-cols-3 gap-x-4 gap-y-2.5 text-sm">
                      <div className="space-y-0.5">
                        <div className="text-muted text-xs">Avg. Age</div>
                        <div className="text-base-content text-sm font-semibold">
                          {stat.avg_patient_age} yrs
                        </div>
                        <div className="text-muted text-xs font-normal">
                          ({stat.min_patient_age}-{stat.max_patient_age})
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
                      {otherPercent > 0 && (
                        <div className="space-y-0.5">
                          <div className="text-muted text-xs">Other</div>
                          <div className="text-base-content font-semibold">
                            {otherPercent}%
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top Districts - Pill Badges */}
                {stat.top_districts && stat.top_districts.length > 0 ? (
                  <div>
                    {stat.top_districts.length <= 5 ? (
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <MapPin className={`size-3.5 ${theme.accentText}`} />
                          <span className="text-base-content/80 text-xs font-semibold tracking-wide">
                            Top Districts ({stat.top_districts.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {stat.top_districts.map((district, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs font-medium"
                            >
                              {district.district} ({district.count})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="collapse rounded-none">
                        <input
                          type="checkbox"
                          checked={
                            expandedClusters[`${stat.cluster_id}-districts`] ||
                            false
                          }
                          onChange={(e) =>
                            setExpandedClusters({
                              ...expandedClusters,
                              [`${stat.cluster_id}-districts`]: e.target.checked,
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
                                Top Districts ({stat.top_districts.length})
                              </span>
                            </div>
                            <span
                              className={`swap swap-rotate ${expandedClusters[`${stat.cluster_id}-districts`]
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
                            {stat.top_districts.slice(0, 5).map((district, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs font-medium"
                              >
                                {district.district} ({district.count})
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="collapse-content mt-1.5 p-0">
                          <div className="flex flex-wrap gap-1.5">
                            {stat.top_districts.slice(5).map((district, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs font-medium"
                              >
                                {district.district} ({district.count})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {selectedVariables.time &&
                  stat.temporal_distribution &&
                  Object.keys(stat.temporal_distribution).length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <Calendar className={`size-3.5 ${theme.accentText}`} />
                        <span className="text-base-content/80 text-xs font-semibold tracking-wide">
                          Temporal Pattern
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(stat.temporal_distribution)
                          .sort((a, b) => a[0].localeCompare(b[0]))
                          .slice(0, 6)
                          .map(([month, count], idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs font-medium"
                            >
                              {month} ({count})
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          );
        })}

        <PatientsModal
          isOpen={selectedClusterId !== null}
          onClose={() => {
            setSelectedClusterId(null);
            setSelectedClusterDisplay("");
          }}
          patients={selectedClusterPatients}
          clusterDisplay={selectedClusterDisplay}
        />
      </div>
    );
  };

export default IllnessClusterOverviewCards;
