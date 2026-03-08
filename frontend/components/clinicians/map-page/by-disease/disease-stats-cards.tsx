"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  MapPin,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

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
  pinnedCases: number;
  unpinnedCases: number;
  coveragePercent: number;
  onTotalClick: () => void;
  onPinnedClick: () => void;
  onUnpinnedClick: () => void;
}

const CoordinatesStatsCards = ({
  totalAllCases,
  pinnedCases,
  unpinnedCases,
  coveragePercent,
  onTotalClick,
  onPinnedClick,
  onUnpinnedClick,
}: CoordinatesStatsCardsProps) => {
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

      <Card
        className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30"
        onClick={onPinnedClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pinned Cases
          </CardTitle>
          <MapPin className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-2xl font-bold">
            {pinnedCases.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Cases with recorded coordinates
          </p>
        </CardContent>
      </Card>

      <Card
        className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30"
        onClick={onUnpinnedClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Unpinned Cases
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-2xl font-bold">
            {unpinnedCases.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Cases without location data
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Coverage
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-2xl font-bold">{coveragePercent}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            Of cases have coordinates
          </p>
        </CardContent>
      </Card>
    </>
  );
};

export { DistrictStatsCards, CoordinatesStatsCards };
