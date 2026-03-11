"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, MapPin, Calendar, CheckSquare, Stethoscope } from "lucide-react";
import type { SurveillanceAnomaly } from "@/types";
import { getReasonLabel } from "@/utils/anomaly-reasons";
import { AnomalyDataTable } from "./anomaly-data-table";

interface TopCriticalAnomaliesProps {
  topAnomalies: SurveillanceAnomaly[];
  onAnomalyClick?: (anomaly: SurveillanceAnomaly) => void;
}

/**
 * Get color class for reason code badge based on category.
 */
function getReasonBadgeColor(code: string): string {
  if (code.startsWith("GEOGRAPHIC:") || code.startsWith("CLUSTER:")) {
    return "badge-warning";
  }
  if (code.startsWith("TEMPORAL:")) {
    return "badge-info";
  }
  if (code.startsWith("COMBINED:")) {
    return "badge-secondary";
  }
  return "badge-ghost";
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
      <div className="absolute inset-0 bg-base-100 opacity-90" />
      <CardHeader className="relative pb-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-error">
            <AlertTriangle className="h-5 w-5" />
            Top Critical Cases
          </CardTitle>
          <div className="text-sm text-base-content/70 mt-1">
            Patients with the lowest anomaly scores requiring immediate review.
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
