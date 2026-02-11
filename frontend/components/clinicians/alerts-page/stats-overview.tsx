import type { OutbreakSummary } from "@/types";
import { Activity, Gauge, Search } from "lucide-react";
import React from "react";

interface StatsOverviewProps {
  data: OutbreakSummary;
}

const stats = [
  {
    key: "total_analyzed" as const,
    label: "Diagnoses Analyzed",
    icon: Search,
    format: (v: number) => v.toLocaleString(),
    color: "text-info",
    bgColor: "from-info/10 to-info/5",
  },
  {
    key: "anomaly_count" as const,
    label: "Anomalies Detected",
    icon: Activity,
    format: (v: number) => v.toLocaleString(),
    color: "text-warning",
    bgColor: "from-warning/10 to-warning/5",
  },
  {
    key: "contamination" as const,
    label: "Contamination Rate",
    icon: Gauge,
    format: (v: number) => `${(v * 100).toFixed(0)}%`,
    color: "text-secondary",
    bgColor: "from-secondary/10 to-secondary/5",
  },
];

const StatsOverview: React.FC<StatsOverviewProps> = ({ data }) => {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const value = data[stat.key];
        return (
          <div
            key={stat.key}
            className="card border-base-300 bg-base-100 border"
          >
            <div className="card-body flex-row items-center gap-4 py-5">
              <div
                className={`rounded-2xl bg-gradient-to-br ${stat.bgColor} p-3`}
              >
                <Icon className={`size-6 ${stat.color}`} />
              </div>
              <div>
                <div className="text-3xl font-semibold tabular-nums">
                  {stat.format(value)}
                </div>
                <div className="text-muted text-sm font-medium">
                  {stat.label}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsOverview;
