"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Clock,
  Users,
  CalendarDays,
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
          <CardTitle className="text-sm font-medium text-base-content/60">
            Total Cases
          </CardTitle>
          <Activity className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-2xl font-bold">
            {totalCases.toLocaleString()}
          </div>
          <p className="text-xs text-base-content/60 mt-1">
            For the selected disease and period
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-base-content/60">
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
          <p className="text-xs text-base-content/60 mt-1">
            With {highestCases.toLocaleString()} reported cases
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-base-content/60">
            Affected Districts
          </CardTitle>
          <MapPin className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-2xl font-bold">
            {affectedDistrictsCount.toLocaleString()}
          </div>
          <p className="text-xs text-base-content/60 mt-1">
            Areas with at least 1 case
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-base-content/60">
            Average Cases
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-2xl font-bold">
            {averageCases.toLocaleString()}
          </div>
          <p className="text-xs text-base-content/60 mt-1">
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
  casesThisWeek: number;
  onTotalClick: () => void;
}

const CoordinatesStatsCards = ({
  totalAllCases,
  newestCaseDate,
  uniquePatientsCount,
  casesThisWeek,
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

  const casesThisWeekSubtitle =
    casesThisWeek === 0
      ? "No new cases in the last 7 days"
      : casesThisWeek === 1
        ? "1 new case recorded this week"
        : `${casesThisWeek.toLocaleString()} new cases recorded this week`;

  return (
    <>
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30"
        onClick={onTotalClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-base-content/60">
            Total Cases
          </CardTitle>
          <Activity className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="p-6 !pt-0">
          <div className="text-2xl font-bold">
            {totalAllCases.toLocaleString()}
          </div>
          <p className="text-xs text-base-content/60 mt-1">
            For the selected disease and period
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-base-content/60">
            Most Recent Case
          </CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent className="p-6 !pt-0">
          <div className="text-2xl font-bold">{newestCaseLabel}</div>
          <p className="text-xs text-base-content/60 mt-1">
            {newestCaseSubtitle}
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-base-content/60">
            Unique Patients
          </CardTitle>
          <Users className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent className="p-6 !pt-0">
          <div className="text-2xl font-bold">
            {uniquePatientsCount.toLocaleString()}
          </div>
          <p className="text-xs text-base-content/60 mt-1">
            Individual patients with this condition
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-base-content/60">
            Cases This Week
          </CardTitle>
          <CalendarDays className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="p-6 !pt-0">
          <div className="text-2xl font-bold">
            {casesThisWeek.toLocaleString()}
          </div>
          <p className="text-xs text-base-content/60 mt-1">
            {casesThisWeekSubtitle}
          </p>
        </CardContent>
      </Card>
    </>
  );
};

export { DistrictStatsCards, CoordinatesStatsCards };
