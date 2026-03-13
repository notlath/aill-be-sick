"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  TrendingUp,
} from "lucide-react";

// ─── District view ────────────────────────────────────────────────────────────

interface AnomalyDistrictStatsCardsProps {
  totalAnomalies: number;
  highestDistrict: string;
  highestCount: number;
  affectedDistrictsCount: number;
  averageAnomalies: number;
  onTotalClick: () => void;
  onMostAffectedClick: () => void;
  onAffectedDistrictsClick: () => void;
}

const AnomalyDistrictStatsCards = ({
  totalAnomalies,
  highestDistrict,
  highestCount,
  affectedDistrictsCount,
  averageAnomalies,
  onTotalClick,
  onMostAffectedClick,
  onAffectedDistrictsClick,
}: AnomalyDistrictStatsCardsProps) => {
  return (
    <>
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30"
        onClick={onTotalClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Anomalies
          </CardTitle>
          <Activity className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-2xl font-bold">
            {totalAnomalies.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Click to view all anomaly records
          </p>
        </CardContent>
      </Card>

      <Card
        className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30"
        onClick={onMostAffectedClick}
      >
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
            With {highestCount.toLocaleString()} detected anomalies
          </p>
        </CardContent>
      </Card>

      <Card
        className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30"
        onClick={onAffectedDistrictsClick}
      >
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
            Click to view all affected districts
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Average Anomalies
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-2xl font-bold">
            {averageAnomalies.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Per affected district
          </p>
        </CardContent>
      </Card>
    </>
  );
};

// ─── Coordinates view ─────────────────────────────────────────────────────────

interface AnomalyCoordinatesStatsCardsProps {
  totalAnomalies: number;
  uniqueLocations: number;
  normalDiagnosesCount: number;
  onTotalClick: () => void;
  onNormalClick: () => void;
}

const AnomalyCoordinatesStatsCards = ({
  totalAnomalies,
  uniqueLocations,
  normalDiagnosesCount,
  onTotalClick,
  onNormalClick,
}: AnomalyCoordinatesStatsCardsProps) => {
  return (
    <>
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30"
        onClick={onTotalClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Anomalies
          </CardTitle>
          <Activity className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-2xl font-bold">
            {totalAnomalies.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Click to view all anomaly records
          </p>
        </CardContent>
      </Card>

      <Card
        className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30"
        onClick={onNormalClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Normal Diagnoses
          </CardTitle>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-2xl font-bold">
            {normalDiagnosesCount.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Click to view all normal records
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Unique Locations
          </CardTitle>
          <MapPin className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-2xl font-bold">
            {uniqueLocations.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Distinct coordinate points on the map
          </p>
        </CardContent>
      </Card>
    </>
  );
};

export { AnomalyDistrictStatsCards, AnomalyCoordinatesStatsCards };
