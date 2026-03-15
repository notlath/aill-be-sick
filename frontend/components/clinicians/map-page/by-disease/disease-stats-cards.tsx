"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Clock,
  Users,
  ShieldCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DistrictStatsCardsProps {
  totalCases: number;
  highestDistrict: string;
  highestCases: number;
  affectedDistrictsCount: number;
  averageCases: number;
}

const DistrictStatsCards = ({
  totalCases,
  highestDistrict,
  highestCases,
  affectedDistrictsCount,
  averageCases,
}: DistrictStatsCardsProps) => {
  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Cases
          </CardTitle>
          <Activity className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-2xl font-bold">
            {totalCases.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            For the selected disease and period
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Most Affected Area
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div
            className="text-2xl font-bold truncate"
            title={highestDistrict}
          >
            {highestDistrict}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            With {highestCases.toLocaleString()} reported cases
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Affected Districts
          </CardTitle>
          <MapPin className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-2xl font-bold">
            {affectedDistrictsCount.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Areas with at least 1 case
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Average Cases
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-2xl font-bold">
            {averageCases.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Per affected district
          </p>
        </CardContent>
      </Card>
    </>
  );
};

interface CoordinatesStatsCardsProps {
  totalAllCases: number;
  newestCaseDate: Date | null;
  uniquePatientsCount: number;
  avgConfidence: number | null;
  onTotalClick: () => void;
}

const CoordinatesStatsCards = ({
  totalAllCases,
  newestCaseDate,
  uniquePatientsCount,
  avgConfidence,
  onTotalClick,
}: CoordinatesStatsCardsProps) => {
  const newestCaseLabel = newestCaseDate
    ? formatDistanceToNow(newestCaseDate, { addSuffix: true })
    : "No cases";

  const newestCaseSubtitle = newestCaseDate
    ? newestCaseDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No recorded cases in this period";

  const confidenceLabel =
    avgConfidence !== null ? `${Math.round(avgConfidence * 100)}%` : "N/A";

  const confidenceSubtitle =
    avgConfidence !== null
      ? avgConfidence >= 0.9
        ? "High reliability"
        : avgConfidence >= 0.7
          ? "Moderate reliability"
          : "Low reliability — review with care"
      : "No confidence data available";

  return (
    <>
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30"
        onClick={onTotalClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Cases
          </CardTitle>
          <Activity className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-2xl font-bold">
            {totalAllCases.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            For the selected disease and period
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Most Recent Case
          </CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-2xl font-bold">{newestCaseLabel}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {newestCaseSubtitle}
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Unique Patients
          </CardTitle>
          <Users className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-2xl font-bold">
            {uniquePatientsCount.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Individual patients with this condition
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg. AI Confidence
          </CardTitle>
          <ShieldCheck className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-2xl font-bold">{confidenceLabel}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {confidenceSubtitle}
          </p>
        </CardContent>
      </Card>
    </>
  );
};

export { DistrictStatsCards, CoordinatesStatsCards };
