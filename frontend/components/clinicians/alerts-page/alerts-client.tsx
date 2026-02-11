"use client";

import type { OutbreakSummary } from "@/types";
import { Activity } from "lucide-react";
import React, { useCallback, useRef, useState } from "react";
import AnomaliesTable from "./anomalies-table";
import DiseaseBreakdownChart from "./disease-breakdown-chart";
import OutbreakBanner from "./outbreak-banner";
import RegionBreakdownChart from "./region-breakdown-chart";
import StatsOverview from "./stats-overview";

interface AlertsClientProps {
  initialData: OutbreakSummary;
}

const AlertsClient: React.FC<AlertsClientProps> = ({ initialData }) => {
  const [data, setData] = useState<OutbreakSummary>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contamination, setContamination] = useState(
    initialData.contamination,
  );
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (contam: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `http://localhost:10000/api/surveillance/outbreaks?summary=true&contamination=${contam}`,
      );
      if (!res.ok) throw new Error("Failed to fetch surveillance data");
      const result: OutbreakSummary = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleContaminationChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const val = parseFloat(e.target.value);
    setContamination(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchData(val), 500);
  };

  return (
    <main className="from-base-100 via-base-200/30 to-base-100 min-h-screen bg-gradient-to-br">
      {/* Hero Header */}
      <div className="px-8 pt-12 pb-8 md:px-16 lg:px-24">
        <div className="mx-auto max-w-[1600px]">
          <div className="animate-fade-in flex items-end justify-between gap-6">
            <div className="space-y-3">
              <h1 className="from-base-content via-base-content to-base-content/70 bg-gradient-to-br bg-clip-text text-6xl font-semibold tracking-tight text-transparent">
                Disease Surveillance
              </h1>
              <p className="text-muted text-lg">
                Real-time outbreak detection powered by Isolation Forest anomaly
                analysis
              </p>
            </div>

            {/* Contamination Control */}
            <div className="card border-base-300 bg-base-100 shrink-0 border p-4">
              <label className="text-xs font-medium" htmlFor="contamination">
                Sensitivity (contamination)
              </label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  id="contamination"
                  type="range"
                  min={0.01}
                  max={0.49}
                  step={0.01}
                  value={contamination}
                  onChange={handleContaminationChange}
                  className="range range-primary range-xs w-40"
                />
                <span className="bg-primary/10 text-primary rounded-lg px-2.5 py-1 text-sm font-semibold tabular-nums">
                  {(contamination * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-muted mt-1 text-[11px]">
                Higher = more sensitive (flags more anomalies)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-16 md:px-16 lg:px-24">
        <div className="mx-auto max-w-[1600px] space-y-6">
          {loading && (
            <div
              className="animate-slide-up flex items-center justify-center gap-3 py-12"
              style={{ animationDelay: "0ms" }}
            >
              <Activity className="text-primary size-8 animate-spin" />
              <p className="text-muted text-sm font-medium">
                Re-analyzing surveillance data...
              </p>
            </div>
          )}

          {!loading && error && (
            <div
              className="animate-slide-up"
              style={{ animationDelay: "0ms" }}
            >
              <div className="card border-error/20 bg-error/5 border">
                <div className="card-body items-center py-16 text-center">
                  <h2 className="text-error text-xl font-semibold">
                    Error Loading Data
                  </h2>
                  <p className="text-muted text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Outbreak Alert Banner */}
              {data.outbreak_alert && (
                <div
                  className="animate-slide-up"
                  style={{ animationDelay: "0ms" }}
                >
                  <OutbreakBanner
                    anomalyCount={data.anomaly_count}
                    totalAnalyzed={data.total_analyzed}
                  />
                </div>
              )}

              {/* Stats Overview */}
              <div
                className="animate-slide-up"
                style={{ animationDelay: "100ms" }}
              >
                <StatsOverview data={data} />
              </div>

              {/* Charts Row */}
              <div
                className="animate-slide-up grid gap-6 lg:grid-cols-2"
                style={{ animationDelay: "200ms" }}
              >
                <DiseaseBreakdownChart
                  diseaseBreakdown={data.disease_breakdown}
                />
                <RegionBreakdownChart
                  regionBreakdown={data.region_breakdown}
                />
              </div>

              {/* Anomalies Table */}
              <div
                className="animate-slide-up"
                style={{ animationDelay: "300ms" }}
              >
                <AnomaliesTable anomalies={data.top_anomalies} />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default AlertsClient;
