"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  MapPin,
  HeartPulse,
  Activity,
} from "lucide-react";
import type { SurveillanceAnomaly } from "@/types";
import {
  computeAnomalyStatistics,
  generateAnomalyNarrative,
  generateClinicalTakeaway,
  type AnomalyStatistics
} from "@/utils/anomaly-summary";
import { getReasonLabel, getReasonDescription } from "@/utils/anomaly-reasons";

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
  const takeaway = generateClinicalTakeaway(stats, selectedDisease);

  // Early return for no flagged cases
  if (anomalies.length === 0) {
    return (
      <Card className="relative overflow-hidden border">
        <div className="absolute inset-0 bg-base-100 opacity-90" />
        <CardHeader className="relative pb-2">
          <div className="font-semibold text-lg text-base-content/60">
            No Flagged Cases Detected
          </div>
        </CardHeader>
        <CardContent className="relative pt-2">
          <p className="text-base-content/50 text-sm">
            All diagnosis records for the selected criteria appear within typical patterns.
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
        <div className="flex-1 w-full md:w-auto">
          <div className="font-semibold text-lg mb-2 flex items-center gap-2">
            <AlertTriangle className="size-5 text-error" />
            Flagged Cases Summary
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative pt-4 space-y-6">
        {/* 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Why Cases Were Flagged */}
        {stats.reason_distribution.length > 0 && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning" />
              <div className="text-base-content font-semibold tracking-tight">
                Why Cases Were Flagged
              </div>
            </div>
            <div className="space-y-2">
              {stats.reason_distribution.slice(0, 5).map((reason, idx) => {
                const Icon = getReasonIcon(reason.label);
                return (
                  <div
                    key={idx}
                    className="text-sm"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon className="size-3.5 text-base-content/60 shrink-0" />
                      <span className="text-base-content/80 font-medium">
                        {getReasonLabel(reason.label)}
                      </span>
                    </div>
                    <p className="text-xs text-base-content/50 ml-5 mb-1">
                      {getReasonDescription(reason.label)}
                    </p>
                    <Badge
                      variant="outline"
                      className={`ml-5 px-2 py-0.5 text-xs font-medium ${getReasonBadgeColor(reason.label)}`}
                    >
                      {reason.count} of {stats.total_anomalies}
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
                Most Common Conditions
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

        {/* Affected Districts */}
        {stats.district_distribution.length > 0 && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="size-4 text-warning" />
              <span className="text-base-content font-semibold tracking-tight">
                Where Cases Are Located
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
        </div>

        {/* What this means — clinical takeaway */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-amber-700 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
            </span>
            <div>
              <p className="text-xs text-amber-800 font-medium mb-1">What this means</p>
              <p className="text-sm text-amber-950 leading-relaxed">{takeaway}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnomalySummary;
