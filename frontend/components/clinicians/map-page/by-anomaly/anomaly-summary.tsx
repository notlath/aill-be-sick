"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  MapPin,
  HeartPulse,
  Activity,
  TrendingDown,
  Gauge
} from "lucide-react";
import type { SurveillanceAnomaly } from "@/types";
import {
  computeAnomalyStatistics,
  generateAnomalyNarrative,
  type AnomalyStatistics
} from "@/utils/anomaly-summary";
import { getReasonLabel } from "@/utils/anomaly-reasons";

interface AnomalySummaryProps {
  anomalies: SurveillanceAnomaly[];
  selectedDisease: string;
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

/**
 * Get icon for reason code category.
 */
function getReasonIcon(code: string) {
  if (code.startsWith("GEOGRAPHIC:") || code.startsWith("CLUSTER:")) {
    return MapPin;
  }
  if (code.startsWith("TEMPORAL:")) {
    return Activity;
  }
  if (code.startsWith("COMBINED:")) {
    return AlertTriangle;
  }
  return AlertTriangle;
}

const AnomalySummary: React.FC<AnomalySummaryProps> = ({
  anomalies,
  selectedDisease,
}) => {
  const stats: AnomalyStatistics = computeAnomalyStatistics(anomalies);
  const narrative = generateAnomalyNarrative(stats, selectedDisease);

  // Early return for no anomalies
  if (anomalies.length === 0) {
    return (
      <Card className="relative overflow-hidden border">
        <div className="absolute inset-0 bg-base-100 opacity-90" />
        <CardHeader className="relative pb-2">
          <div className="font-semibold text-lg text-base-content/60">
            No Anomalies Detected
          </div>
        </CardHeader>
        <CardContent className="relative pt-2">
          <p className="text-base-content/50 text-sm">
            All diagnosis records for the selected criteria appear within normal patterns.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Parse narrative for bold text rendering
  const renderNarrative = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-amber-700">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <Card className="relative overflow-hidden border">
      <CardHeader className="relative pb-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="font-semibold text-lg mb-2 flex items-center gap-2">
            <AlertTriangle className="size-5 text-error" />
            Anomaly Summary
          </div>

          <div className="bg-amber-50 rounded-xl border border-amber-200 p-3.5 inline-block">
            <div className="text-sm text-amber-950 leading-relaxed">
              {renderNarrative(narrative)}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Reason Codes Distribution */}
        {stats.reason_distribution.length > 0 && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning" />
              <div className="text-base-content font-semibold tracking-tight">
                Reason Flags ({stats.reason_distribution.length})
              </div>
            </div>
            <div className="space-y-2">
              {stats.reason_distribution.slice(0, 5).map((reason, idx) => {
                const Icon = getReasonIcon(reason.label);
                return (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="size-3.5 text-base-content/60" />
                      <span className="text-base-content/80">
                        {getReasonLabel(reason.label)}
                      </span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`px-2 py-0.5 text-xs font-medium ${getReasonBadgeColor(reason.label)}`}
                    >
                      {reason.count} ({reason.percent}%)
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Diseases */}
        {stats.disease_distribution.length > 0 && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <HeartPulse className="size-4 text-error" />
              <div className="text-base-content font-semibold tracking-tight">
                Diseases ({stats.disease_distribution.length})
              </div>
            </div>
            <div className="space-y-2">
              {stats.disease_distribution.slice(0, 5).map((disease, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-base-content/80">{disease.label}</span>
                  <span className="text-base-content font-medium bg-base-200 px-2 py-0.5 rounded-full text-xs">
                    {disease.count} ({disease.percent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Anomaly Characteristics */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Gauge className="size-4 text-info" />
            <span className="text-base-content font-semibold tracking-tight">
              Characteristics
            </span>
          </div>
          <div className="bg-base-200/50 p-3 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="size-3.5 text-muted" />
              <div className="text-muted text-xs">Avg. Anomaly Score</div>
            </div>
            <div className="text-base-content text-lg font-semibold tabular-nums">
              {stats.avg_anomaly_score.toFixed(2)}
            </div>
            <div className="text-muted text-xs font-normal">
              Lower = more anomalous
            </div>
          </div>
        </div>

        {/* Affected Districts */}
        {stats.district_distribution.length > 0 && (
          <div className="md:col-span-3">
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="size-4 text-warning" />
              <span className="text-base-content font-semibold tracking-tight">
                Affected Districts ({stats.district_distribution.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.district_distribution.slice(0, 10).map((district, idx) => (
                <Badge
                  key={idx}
                  className="px-2 py-1 text-xs text-base-content font-medium bg-base-200 hover:bg-base-300"
                >
                  {district.label}
                  <span className="ml-1.5 opacity-60 tabular-nums">
                    ({district.count})
                  </span>
                </Badge>
              ))}
              {stats.district_distribution.length > 10 && (
                <Badge className="px-2 py-1 text-xs bg-base-300">
                  +{stats.district_distribution.length - 10} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AnomalySummary;
