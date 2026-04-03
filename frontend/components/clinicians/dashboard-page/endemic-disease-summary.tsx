"use client";

import * as React from "react";
import { MapPinned, TrendingUp, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  getEndemicDiseases,
  getDiseasesInPeakSeason,
  formatPeakMonths,
  type DiseaseMetadata,
} from "@/constants/diseases";

/**
 * Endemic Disease Summary Component
 *
 * Displays an overview of endemic diseases in the Philippines,
 * highlighting which diseases are currently in peak season.
 * This helps clinicians contextualize diagnoses within local
 * epidemiological patterns.
 */
const EndemicDiseaseSummary: React.FC = () => {
  const endemicDiseases = getEndemicDiseases();
  const peakSeasonDiseases = getDiseasesInPeakSeason();

  const currentMonth = new Date().toLocaleString("en-US", { month: "long" });

  return (
    <Card className="border-border bg-base-200 overflow-hidden w-full">
      <div className="flex flex-col md:flex-row h-full">
        {/* Left Section: Header & Peak Season Alert */}
        <div className="flex flex-col w-full md:w-1/3 border-b md:border-b-0 md:border-r border-warning/20 p-5 gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-[12px] bg-gradient-to-br from-warning/20 to-warning/10 p-2.5">
              <MapPinned className="size-5 text-warning" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base-content text-lg">
                Endemic Disease Awareness
              </h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                {currentMonth} — Philippines regional context
              </p>
            </div>
          </div>
          
          {peakSeasonDiseases.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 mt-auto">
              <div className="flex items-start gap-2">
                <TrendingUp className="size-4 text-warning mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-warning">
                    Peak Season Alert
                  </p>
                  <p className="text-xs text-base-content/70 mt-1">
                    {peakSeasonDiseases.length === 1
                      ? `${peakSeasonDiseases[0].name} is currently in peak season.`
                      : `${peakSeasonDiseases.map((d) => d.name).join(", ")} are currently in peak season.`}{" "}
                    Consider these diagnoses more carefully.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Endemic Diseases Grid */}
        <div className="flex flex-col flex-1 p-5 gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-base-content/60">
              <Info className="size-3" />
              <span>Endemic diseases in the Philippines</span>
            </div>
            {/* Severity Legend */}
            <div className="flex items-center gap-3 text-[10px] text-base-content/50">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-red-500" />
                Critical
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-amber-500" />
                High
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-teal-500" />
                Moderate
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {endemicDiseases.map((disease) => (
              <EndemicDiseaseItem
                key={disease.value}
                disease={disease}
                isPeakSeason={peakSeasonDiseases.some(
                  (d) => d.value === disease.value
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

interface EndemicDiseaseItemProps {
  disease: DiseaseMetadata;
  isPeakSeason: boolean;
}

const EndemicDiseaseItem: React.FC<EndemicDiseaseItemProps> = ({
  disease,
  isPeakSeason,
}) => {
  const severityColors = {
    critical: "bg-red-500",
    high: "bg-amber-500",
    moderate: "bg-teal-500",
    low: "bg-gray-400",
  };

  return (
    <div
      className={`rounded-lg border p-2.5 transition-colors ${
        isPeakSeason
          ? "border-warning/40 bg-warning/5"
          : "border-base-300/50 bg-base-100/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`size-2 rounded-full shrink-0 ${
                severityColors[disease.severityLevel]
              }`}
            />
            <span className="text-sm font-medium text-base-content truncate">
              {disease.name}
            </span>
            {isPeakSeason && (
              <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold text-warning">
                <TrendingUp className="size-2.5" />
                Peak
              </span>
            )}
          </div>
          {disease.peakMonths && disease.peakMonths.length > 0 && (
            <p className="text-[10px] text-base-content/50 mt-0.5 truncate">
              Peak: {formatPeakMonths(disease)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EndemicDiseaseSummary;
