"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Stethoscope, Users, UserRound } from "lucide-react";
import { IllnessClusterStatistics } from "@/types";

interface StatisticsCardsProps {
  totalCases: number;
  stat: IllnessClusterStatistics | null;
}

const StatisticsCards = ({ totalCases, stat }: StatisticsCardsProps) => {
  const topDisease = stat?.top_diseases?.[0] ?? null;
  const totalDiseases = stat?.disease_distribution
    ? Object.keys(stat.disease_distribution).length
    : 0;

  const minAge = stat?.min_patient_age ?? null;
  const maxAge = stat?.max_patient_age ?? null;
  const avgAge = stat?.avg_patient_age != null
    ? Math.round(stat.avg_patient_age)
    : null;

  const genderDist = stat?.gender_distribution ?? null;
  const totalGendered =
    genderDist != null
      ? (genderDist.MALE ?? 0) + (genderDist.FEMALE ?? 0) + (genderDist.OTHER ?? 0)
      : 0;
  const malePct =
    totalGendered > 0
      ? Math.round(((genderDist?.MALE ?? 0) / totalGendered) * 100)
      : null;
  const femalePct =
    totalGendered > 0
      ? Math.round(((genderDist?.FEMALE ?? 0) / totalGendered) * 100)
      : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
      {/* Total Cases */}
      <Card className="hover:shadow-md transition-shadow hover:border-primary/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Cases
          </CardTitle>
          <Activity className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="p-6 !pt-0">
          <div className="text-2xl font-bold">{totalCases.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            In the selected group and period
          </p>
        </CardContent>
      </Card>

      {/* Most Common Illness */}
      <Card className="hover:shadow-md transition-shadow hover:border-primary/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Most Common Illness
          </CardTitle>
          <Stethoscope className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="p-6 !pt-0">
          <div className="text-2xl font-bold capitalize">
            {topDisease
              ? topDisease.disease.charAt(0).toUpperCase() +
                topDisease.disease.slice(1).toLowerCase()
              : "—"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {topDisease
              ? `${topDisease.count.toLocaleString()} cases · ${totalDiseases} illness${totalDiseases !== 1 ? "es" : ""} detected`
              : "No data available"}
          </p>
        </CardContent>
      </Card>

      {/* Affected Age Range */}
      <Card className="hover:shadow-md transition-shadow hover:border-primary/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Affected Age Range
          </CardTitle>
          <Users className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="p-6 !pt-0">
          <div className="text-2xl font-bold">
            {minAge != null && maxAge != null
              ? `${minAge} – ${maxAge}`
              : "—"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {avgAge != null
              ? `Average age: ${avgAge} years old`
              : "No age data available"}
          </p>
        </CardContent>
      </Card>

      {/* Gender Split */}
      <Card className="hover:shadow-md transition-shadow hover:border-primary/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Gender Split
          </CardTitle>
          <UserRound className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="p-6 !pt-0">
          {malePct != null && femalePct != null ? (
            <div className="space-y-0.5">
              <div className="text-2xl font-bold">{malePct}% male</div>
              <div className="text-sm font-medium text-muted-foreground">
                {femalePct}% female
              </div>
            </div>
          ) : (
            <div className="text-2xl font-bold">—</div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Distribution across this group
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsCards;
