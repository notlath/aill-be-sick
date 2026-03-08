"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  AlertTriangle,
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
}

const AnomalyDistrictStatsCards = ({
  totalAnomalies,
  highestDistrict,
  highestCount,
  affectedDistrictsCount,
  averageAnomalies,
}: AnomalyDistrictStatsCardsProps) => {
  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
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
            With {highestCount.toLocaleString()} detected anomalies
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
            Areas with at least 1 anomaly
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
  outbreakAlert: boolean;
  contaminationRate: number;
  uniqueLocations: number;
  onTotalClick: () => void;
}

const AnomalyCoordinatesStatsCards = ({
  totalAnomalies,
  outbreakAlert,
  contaminationRate,
  uniqueLocations,
  onTotalClick,
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

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Outbreak Alert
          </CardTitle>
          <AlertTriangle
            className={`h-4 w-4 ${outbreakAlert ? "text-destructive" : "text-emerald-500"}`}
          />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div
            className={`text-2xl font-bold ${outbreakAlert ? "text-destructive" : "text-emerald-500"}`}
          >
            {outbreakAlert ? "Active" : "None"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {outbreakAlert
              ? "Elevated anomaly levels detected"
              : "No outbreak detected for this period"}
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Contamination Rate
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-2xl font-bold">
            {(contaminationRate * 100).toFixed(0)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Estimated proportion of anomalies in population
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
