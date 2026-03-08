"use client";
import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, HeartPulse } from "lucide-react";
import type { IllnessClusterStatistics } from "@/types";
import { CLUSTER_THEMES } from "../../../../constants/cluster-themes";

interface SelectedClusterSummaryProps {
  stat: IllnessClusterStatistics;
  clusterIndex: number;
  selectedVariables?: {
    age: boolean;
    gender: boolean;
    district: boolean;
    time: boolean;
  };
}

const SelectedClusterSummary: React.FC<SelectedClusterSummaryProps> = ({
  stat,
  clusterIndex,
  selectedVariables = {
    age: true,
    gender: true,
    district: true,
    time: false,
  },
}) => {
  const theme = CLUSTER_THEMES[clusterIndex % CLUSTER_THEMES.length];

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

  // Descriptors logic
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
    <Card className={`relative overflow-hidden border `}>
      {/* Subtle background color based on theme */}
      <div className={`absolute inset-0 bg-base-100 opacity-90`} />

      <CardHeader className="relative pb-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="font-semibold text-lg mb-2 flex items-center gap-2">
            Group {clusterIndex + 1} Summary
            <div className={`w-3 h-3 rounded-full ${theme.iconBg}`} />
          </div>

          <div className={`${theme.accentBg} rounded-[12px] border p-3.5 ${theme.border} inline-block`}>
            <div className="text-base-content/80 text-sm leading-relaxed">
              {stat.count} diagnoses
              {regionLocation ? (
                <>
                  {" "}
                  {hasMultipleDistricts ? "primarily" : regionPrefix}{" "}
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
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative pt-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Top Diseases */}
        {stat.top_diseases && stat.top_diseases.length > 0 ? (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <HeartPulse className={`size-4 ${theme.accentText}`} />
              <div className="text-base-content font-semibold tracking-tight">
                Diseases ({stat.top_diseases.length})
              </div>
            </div>
            <div className="space-y-2">
              {stat.top_diseases.map((d, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-base-content/80">{d.disease}</span>
                  <span className="text-base-content font-medium bg-base-200 px-2 py-0.5 rounded-full text-xs">
                    {d.count} ({Math.round(d.count / stat.count * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Demographics */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Users className={`size-4 ${theme.accentText}`} />
            <span className="text-base-content font-semibold tracking-tight">
              Demographics
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-base-200/50 p-3 rounded-xl">
              <div className="text-muted text-xs mb-1">Avg. Age</div>
              <div className="text-base-content text-lg font-semibold tabular-nums">
                {stat.avg_patient_age} yrs
              </div>
              <div className="text-muted text-xs font-normal">
                {stat.min_patient_age}-{stat.max_patient_age} yrs
              </div>
            </div>
            <div className="bg-base-200/50 p-3 rounded-xl flex flex-col justify-center">
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="text-base-content/70">Male</span>
                <span className="font-semibold tabular-nums">{malePercent}%</span>
              </div>
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-base-content/70">Female</span>
                <span className="font-semibold tabular-nums">{femalePercent}%</span>
              </div>
              {otherPercent > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-base-content/70">Other</span>
                  <span className="font-semibold tabular-nums">{otherPercent}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Districts */}
        {stat.top_districts && stat.top_districts.length > 0 ? (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <MapPin className={`size-4 ${theme.accentText}`} />
              <span className="text-base-content font-semibold tracking-tight">
                Affected Districts ({stat.top_districts.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {stat.top_districts.map((district, idx) => (
                <Badge
                  key={idx}
                  className="px-2 py-1 text-xs text-base-content font-medium bg-base-200 hover:bg-base-300"
                >
                  {district.district}
                  <span className="ml-1.5 opacity-60 tabular-nums">({district.count})</span>
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default SelectedClusterSummary;
