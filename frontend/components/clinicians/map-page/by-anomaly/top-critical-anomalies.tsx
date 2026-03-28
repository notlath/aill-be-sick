"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import type { SurveillanceAnomaly } from "@/types";
import { AnomalyDataTable } from "./anomaly-data-table";

interface TopCriticalAnomaliesProps {
  topAnomalies: SurveillanceAnomaly[];
  onAnomalyClick?: (anomaly: SurveillanceAnomaly) => void;
}

const TopCriticalAnomalies: React.FC<TopCriticalAnomaliesProps> = ({
  topAnomalies,
  onAnomalyClick,
}) => {
  if (topAnomalies.length === 0) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden border">
      <CardHeader className="relative pb-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-error">
            <AlertTriangle className="h-5 w-5" />
            Top Critical Cases
          </CardTitle>
          <div className="text-sm text-base-content/70 mt-1">
            The highest-priority flagged cases for this period. Review these patients first.
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 pt-0">
        <AnomalyDataTable data={topAnomalies} isAnomaly={true} />
      </CardContent>
    </Card>
  );
};

export default TopCriticalAnomalies;
