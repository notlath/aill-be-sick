"use client";

import type { SurveillanceAnomaly } from "@/types";
import React from "react";

interface AnomaliesTableProps {
  anomalies: SurveillanceAnomaly[];
}

const AnomaliesTable: React.FC<AnomaliesTableProps> = ({ anomalies }) => {
  if (!anomalies || anomalies.length === 0) {
    return (
      <div className="card border-base-300 bg-base-100 border">
        <div className="card-body">
          <h3 className="text-lg font-semibold">Top Anomalous Diagnoses</h3>
          <p className="text-muted text-sm">No anomalies detected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-base-300 bg-base-100 border">
      <div className="card-body">
        <h3 className="text-lg font-semibold">Top Anomalous Diagnoses</h3>
        <p className="text-muted mb-3 text-sm">
          Most anomalous records ranked by Isolation Forest score (lower = more
          anomalous)
        </p>

        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="border-base-300">
                <th className="text-muted text-xs font-semibold uppercase tracking-wide">
                  #
                </th>
                <th className="text-muted text-xs font-semibold uppercase tracking-wide">
                  Disease
                </th>
                <th className="text-muted text-xs font-semibold uppercase tracking-wide">
                  City
                </th>
                <th className="text-muted text-xs font-semibold uppercase tracking-wide">
                  Region
                </th>
                <th className="text-muted text-xs font-semibold uppercase tracking-wide">
                  Confidence
                </th>
                <th className="text-muted text-xs font-semibold uppercase tracking-wide">
                  Anomaly Score
                </th>
                <th className="text-muted text-xs font-semibold uppercase tracking-wide">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((anomaly, idx) => (
                <tr
                  key={anomaly.id}
                  className="border-base-300 hover:bg-base-200/50 transition-colors"
                >
                  <td className="text-muted text-xs tabular-nums">
                    {idx + 1}
                  </td>
                  <td>
                    <span
                      className={`badge badge-sm font-medium ${getDiseaseVariant(anomaly.disease)}`}
                    >
                      {anomaly.disease}
                    </span>
                  </td>
                  <td className="text-sm">{anomaly.city || "—"}</td>
                  <td className="text-sm">{anomaly.region || "—"}</td>
                  <td className="tabular-nums text-sm">
                    {(anomaly.confidence * 100).toFixed(1)}%
                  </td>
                  <td>
                    <span
                      className={`font-mono text-sm font-medium tabular-nums ${
                        anomaly.anomaly_score < -0.1
                          ? "text-error"
                          : anomaly.anomaly_score < 0
                            ? "text-warning"
                            : "text-muted"
                      }`}
                    >
                      {anomaly.anomaly_score.toFixed(4)}
                    </span>
                  </td>
                  <td className="text-muted text-sm tabular-nums">
                    {formatDate(anomaly.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function getDiseaseVariant(disease: string): string {
  const variants: Record<string, string> = {
    Dengue: "badge-warning",
    Pneumonia: "badge-info",
    Typhoid: "badge-secondary",
    Impetigo: "badge-success",
    Measles: "badge-error",
    Influenza: "badge-accent",
  };
  return variants[disease] || "badge-neutral";
}

function formatDate(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default AnomaliesTable;
