"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  MapPin,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

interface StatisticsCardsProps {
  totalAllCases: number;
  pinnedCases: number;
  unpinnedCases: number;
  coveragePercent: number;
  onTotalClick: () => void;
  onPinnedClick: () => void;
  onUnpinnedClick: () => void;
}

const StatisticsCards = ({
  totalAllCases,
  pinnedCases,
  unpinnedCases,
  coveragePercent,
  onTotalClick,
  onPinnedClick,
  onUnpinnedClick,
}: StatisticsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
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
            For the selected group and period
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
    </div>
  );
};

export default StatisticsCards;
