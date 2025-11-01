"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";

type Differential = {
  code?: string | null;
  label: string;
  prob: number;
};

type CDSSPayload = {
  differential?: Differential[];
  triage?: {
    level: string;
    reasons?: string[];
  };
  red_flags?: string[];
  recommendation?: {
    care_setting?: string;
    actions?: string[];
    rationale?: string[];
  };
  knowledge?: { topic: string; source?: string; link?: string }[];
  meta?: {
    model?: string;
    model_version?: string;
    thresholds?: Record<string, number>;
  };
};

export default function CDSSSummary({ cdss }: { cdss: CDSSPayload }) {
  if (!cdss) return null;

  const fmtPct = (p?: number) =>
    typeof p === "number" && isFinite(p) ? `${(p * 100).toFixed(1)}%` : "-";

  // Patients can find differentials scary; keep them hidden by default.
  const [showDifferential, setShowDifferential] = useState(false);

  return (
    <Card className="border-base-300 bg-base-100 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">CDSS Summary</h3>
        {cdss.meta?.model && (
          <span className="text-xs text-base-content/70">
            Model: {cdss.meta.model}
          </span>
        )}
      </div>

      {/* Triage */}
      {cdss.triage && (
        <div className="mb-3">
          <div className="text-sm font-medium">Triage</div>
          <div className="mt-1 rounded-md border border-base-300 p-2">
            <div className="flex items-center gap-2">
              <span className="badge badge-outline">{cdss.triage.level}</span>
            </div>
            {cdss.triage.reasons && cdss.triage.reasons.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-sm text-base-content/80">
                {cdss.triage.reasons.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Red flags */}
      {cdss.red_flags && cdss.red_flags.length > 0 && (
        <div className="mb-3">
          <div className="text-sm font-medium">Red Flags</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {cdss.red_flags.map((rf, idx) => (
              <span key={idx} className="badge badge-error badge-outline">
                {rf}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      {cdss.recommendation && (
        <div className="mb-3">
          <div className="text-sm font-medium">Recommendation</div>
          <div className="mt-1 rounded-md border border-base-300 p-2 text-sm">
            {cdss.recommendation.care_setting && (
              <div className="mb-1">
                Care setting:{" "}
                <span className="font-medium">
                  {cdss.recommendation.care_setting}
                </span>
              </div>
            )}
            {cdss.recommendation.actions &&
              cdss.recommendation.actions.length > 0 && (
                <ul className="list-inside list-disc">
                  {cdss.recommendation.actions.map((a, idx) => (
                    <li key={idx}>{a}</li>
                  ))}
                </ul>
              )}
          </div>
        </div>
      )}

      {/* Differential (hidden by default for patients) */}
      {cdss.differential && cdss.differential.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Other possibilities</div>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setShowDifferential((s) => !s)}
            >
              {showDifferential
                ? "Hide details"
                : "Show details (for clinicians)"}
            </button>
          </div>
          {showDifferential ? (
            <div className="mt-2 overflow-x-auto">
              <table className="table table-zebra table-sm">
                <thead>
                  <tr>
                    <th>Condition</th>
                    <th>Probability</th>
                  </tr>
                </thead>
                <tbody>
                  {cdss.differential.map((d, idx) => (
                    <tr key={idx}>
                      <td>{d.label}</td>
                      <td>{fmtPct(d.prob)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-1 text-xs text-base-content/70">
              We consider multiple possibilities before giving guidance.
              Detailed list is available for clinicians.
            </p>
          )}
        </div>
      )}

      {/* Knowledge */}
      {cdss.knowledge && cdss.knowledge.length > 0 && (
        <div className="mb-1">
          <div className="text-sm font-medium">Knowledge</div>
          <ul className="mt-1 list-inside list-disc text-sm text-base-content/80">
            {cdss.knowledge.map((k, idx) => (
              <li key={idx}>
                {k.topic}
                {k.source ? ` — ${k.source}` : ""}
                {k.link ? (
                  <>
                    {" "}
                    <a
                      href={k.link}
                      target="_blank"
                      rel="noreferrer"
                      className="link"
                    >
                      link
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
