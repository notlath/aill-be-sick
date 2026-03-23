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

type CDSSSummaryProps = {
  cdss: CDSSPayload;
  /** ISO-8601 string or Date. Falls back to component render time when absent. */
  generatedAt?: string | Date;
  confidence?: number;
  uncertainty?: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────

const fmtPct = (p?: number) =>
  typeof p === "number" && isFinite(p) ? `${(p * 100).toFixed(1)}%` : "-";

/** Map triage level strings to severity-appropriate DaisyUI badge classes.
 *  Fix #2 — triage severity styling (patient-safety critical). */
const getTriageBadgeClass = (level: string): string => {
  switch (level.toUpperCase()) {
    case "URGENT":
    case "HIGH":
      return "badge-error";
    case "MODERATE":
    case "MEDIUM":
      return "badge-warning";
    case "LOW":
      return "badge-info";
    default:
      return "badge-outline";
  }
};

const formatTimestamp = (date: Date): string =>
  date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

// ── Component ──────────────────────────────────────────────────────────────

const CDSSSummary = ({ cdss, generatedAt, confidence, uncertainty }: CDSSSummaryProps) => {
  if (!cdss) return null;

  // Fix #7 — clinical outputs need temporal context.
  // Only render timestamp if explicitly provided to avoid hydration mismatch.
  const timestamp = generatedAt ? new Date(generatedAt) : null;

  // Patients can find differentials scary; keep them hidden by default.
  const [showDifferential, setShowDifferential] = useState(false);

  // Fix #8 — show code column only when at least one differential carries a code
  const hasAnyCodes = cdss.differential?.some((d) => d.code) ?? false;

  return (
    <Card className="border-base-300 bg-base-100 p-3 px-4 rounded-xl">
      {/* Header — Fix #4: plain-language title */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Clinical support summary</h3>
        <div className="flex items-center gap-3 text-xs text-base-content/70">
          {cdss.meta?.model && <span>Model: {cdss.meta.model}</span>}
          {/* Fix #7: timestamp — only render if provided to avoid hydration mismatch */}
          {timestamp && (
            <time dateTime={timestamp.toISOString()}>
              {formatTimestamp(timestamp)}
            </time>
          )}
        </div>
      </div>

      {/* Confidence/Uncertainty Warning */}
      {((typeof confidence === 'number' && confidence < 0.95) || (typeof uncertainty === 'number' && uncertainty > 0.05)) && (
        <div className="alert alert-warning mb-4 rounded-lg shadow-sm border border-warning/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <div>
            <h4 className="font-bold text-sm">Model is uncertain</h4>
            <div className="text-xs">The AI model is not highly confident in this assessment. Please interpret the following differentials and recommendations with caution.</div>
          </div>
        </div>
      )}

      {/* Triage — Fix #2: severity-based badge styling */}
      {cdss.triage && (
        <div className="mb-3">
          <div className="text-sm font-medium mb-2">Triage</div>
          <div className="rounded-lg border border-base-300 p-3">
            <div className="flex items-center gap-2">
              <span
                className={`badge ${getTriageBadgeClass(cdss.triage.level)}`}
              >
                {cdss.triage.level}
              </span>
            </div>
            {cdss.triage.reasons && cdss.triage.reasons.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-sm text-base-content/80 space-y-1">
                {cdss.triage.reasons.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Red flags — Fix #6: ARIA live region for screen readers */}
      {cdss.red_flags && cdss.red_flags.length > 0 && (
        <div className="mb-3" role="alert" aria-live="assertive">
          <div className="text-sm font-medium mb-2">Red Flags</div>
          <div className="flex flex-wrap gap-2">
            {cdss.red_flags.map((rf, idx) => (
              <span key={idx} className="badge badge-error badge-outline">
                {rf}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation — Fix #3: render rationale when present */}
      {cdss.recommendation && (
        <div className="mb-3">
          <div className="text-sm font-medium mb-2">Recommendation</div>
          <div className="rounded-lg border border-base-300 p-3 text-sm space-y-2">
            {cdss.recommendation.care_setting && (
              <div>
                <span className="font-medium">Care setting:</span>{" "}
                <span className="text-base-content/90">
                  {cdss.recommendation.care_setting}
                </span>
              </div>
            )}
            {cdss.recommendation.actions &&
              cdss.recommendation.actions.length > 0 && (
                <ul className="list-inside list-disc space-y-1">
                  {cdss.recommendation.actions.map((a, idx) => (
                    <li key={idx}>{a}</li>
                  ))}
                </ul>
              )}
            {/* Fix #3: rationale — FDA criterion 4 requires reviewable basis */}
            {cdss.recommendation.rationale &&
              cdss.recommendation.rationale.length > 0 && (
                <div className="mt-2 border-t border-base-300 pt-2">
                  <span className="font-medium">Rationale:</span>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-base-content/80">
                    {cdss.recommendation.rationale.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Differential — Fix #8: show code column; Fix #9: relabel */}
      {cdss.differential && cdss.differential.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            {/* Fix #9: plain-language label */}
            <div className="text-sm font-medium">
              Other conditions considered
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowDifferential((s) => !s)}
            >
              {showDifferential
                ? "Hide details"
                : "Show details (for clinicians)"}
            </button>
          </div>
          {showDifferential ? (
            <div className="mt-2 overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Condition</th>
                    {/* Fix #8: code column when data exists */}
                    {hasAnyCodes && <th>Code</th>}
                    <th>Probability</th>
                  </tr>
                </thead>
                <tbody>
                  {cdss.differential.map((d, idx) => (
                    <tr key={idx}>
                      <td>{d.label}</td>
                      {hasAnyCodes && (
                        <td className="font-mono text-xs text-base-content/70">
                          {d.code ?? "-"}
                        </td>
                      )}
                      <td>{fmtPct(d.prob)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-base-content/70">
              We consider multiple possibilities before giving guidance.
              Detailed list is available for clinicians.
            </p>
          )}
        </div>
      )}

      {/* Knowledge — Fix #5: descriptive link text for WCAG 2.4.4 */}
      {cdss.knowledge && cdss.knowledge.length > 0 && (
        <div className="mb-3">
          <div className="text-sm font-medium mb-2">Knowledge</div>
          <ul className="list-inside list-disc text-sm text-base-content/80 space-y-1">
            {cdss.knowledge.map((k, idx) => (
              <li key={idx}>
                {k.topic}
                {k.source ? ` \u2014 ${k.source}` : ""}
                {k.link ? (
                  <>
                    {" "}
                    <a
                      href={k.link}
                      target="_blank"
                      rel="noreferrer"
                      className="link"
                    >
                      {k.source ? `View ${k.source}` : "View source"}
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fix #1: Disclaimer footer — FDA CDS compliance */}
      <footer className="mt-2 rounded-md bg-base-200 px-3 py-2 text-xs text-base-content/70">
        This summary supports clinical decision-making. It does not replace
        professional medical judgment.
      </footer>
    </Card>
  );
};

export default CDSSSummary;
