"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { 
  AlertTriangle, 
  Activity, 
  ListChecks, 
  BookOpen, 
  ShieldAlert, 
  Info,
  ChevronDown,
  ChevronUp,
  FileText
} from "lucide-react";

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

const getTriageBadgeClass = (level: string): string => {
  switch (level.toUpperCase()) {
    case "EMERGENT":
    case "URGENT":
    case "HIGH":
      return "badge-error";
    case "MODERATE":
    case "MEDIUM":
      return "badge-warning";
    case "LOW":
    case "NON-URGENT":
      return "badge-info";
    default:
      return "badge-outline";
  }
};

const getTriageDescription = (level: string): string => {
  switch (level.toUpperCase()) {
    case "EMERGENT":
    case "URGENT":
    case "HIGH":
      return "Seek medical attention immediately.";
    case "MODERATE":
    case "MEDIUM":
      return "Please consult a healthcare provider soon.";
    case "LOW":
    case "NON-URGENT":
      return "You can manage this at home or schedule a routine visit if symptoms persist.";
    default:
      return "Please consult a healthcare provider.";
  }
};

const getProbabilityColor = (prob: number) => {
  if (prob >= 0.7) return "progress-error";
  if (prob >= 0.3) return "progress-warning";
  return "progress-info";
};

const formatTimestamp = (date: Date): string =>
  date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

// ── Component ──────────────────────────────────────────────────────────────

const CDSSSummary = ({ cdss, generatedAt, confidence, uncertainty }: CDSSSummaryProps) => {
  if (!cdss) return null;

  // Render timestamp only if provided to avoid hydration mismatch
  const timestamp = generatedAt ? new Date(generatedAt) : null;
  
  const [showDifferential, setShowDifferential] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const hasAnyCodes = cdss.differential?.some((d) => d.code) ?? false;

  return (
    <Card className="border-base-300 bg-base-100 p-4 rounded-xl">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b border-base-200 pb-3">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Clinical support summary
        </h3>
        <div className="flex items-center gap-3 text-xs text-base-content/70">
          {timestamp && (
            <time dateTime={timestamp.toISOString()}>
              {formatTimestamp(timestamp)}
            </time>
          )}
        </div>
      </div>

      {/* Confidence/Uncertainty Warning */}
      {((typeof confidence === 'number' && confidence < 0.95) || (typeof uncertainty === 'number' && uncertainty > 0.05)) && (
        <div className="alert alert-warning mb-5 rounded-lg shadow-sm border border-warning/20">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Model is uncertain</h4>
            <div className="text-xs">The AI model is not highly confident in this assessment. Please interpret the following information with caution.</div>
          </div>
        </div>
      )}

      {/* Triage */}
      {cdss.triage && (
        <div className="mb-6">
          <h4 className="text-sm font-bold mb-2 flex items-center gap-2 text-base-content uppercase tracking-wide">
            <ShieldAlert className="w-4 h-4 text-base-content/70" />
            How urgent is this?
          </h4>
          <div className="rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <span className={`badge badge-lg font-bold ${getTriageBadgeClass(cdss.triage.level)}`}>
                {cdss.triage.level}
              </span>
              <span className="text-sm font-medium text-base-content/90">
                {getTriageDescription(cdss.triage.level)}
              </span>
            </div>
            {cdss.triage.reasons && cdss.triage.reasons.length > 0 && (
              <ul className="mt-3 list-inside list-disc text-sm text-base-content/70 space-y-1">
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
        <div className="mb-6" role="alert" aria-live="assertive">
          <h4 className="text-sm font-bold mb-2 flex items-center gap-2 text-base-content uppercase tracking-wide">
            <AlertTriangle className="w-4 h-4 text-error" />
            Warning signs detected
          </h4>
          <p className="text-xs mb-3 text-base-content/70 font-medium">Based on what you described, we noticed:</p>
          <div className="flex flex-wrap gap-2">
            {cdss.red_flags.map((rf, idx) => (
              <span key={idx} className="badge badge-error badge-outline font-medium badge-md">
                {rf}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      {cdss.recommendation && (
        <div className="mb-6">
          <h4 className="text-sm font-bold mb-2 flex items-center gap-2 text-base-content uppercase tracking-wide">
            <ListChecks className="w-4 h-4 text-base-content/70" />
            What to do next
          </h4>
          <div className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-4 shadow-sm">
            {cdss.recommendation.care_setting && (
              <div className="flex items-center gap-3 bg-base-200/50 p-3 rounded-md">
                <span className="badge badge-neutral badge-sm font-semibold uppercase tracking-wider">Care Setting</span>
                <span className="font-bold text-sm text-base-content">{cdss.recommendation.care_setting}</span>
              </div>
            )}
            
            {cdss.recommendation.actions && cdss.recommendation.actions.length > 0 && (
              <ul className="list-inside list-disc space-y-2 text-sm text-base-content/90 pl-1">
                {cdss.recommendation.actions.map((a, idx) => (
                  <li key={idx} className="marker:text-primary">{a}</li>
                ))}
              </ul>
            )}

            {/* Rationale - Rewritten slightly to be friendlier */}
            {cdss.recommendation.rationale && cdss.recommendation.rationale.length > 0 && (
              <div className="mt-4 rounded bg-base-200/50 p-3">
                <p className="text-xs font-bold text-base-content/80 mb-1 uppercase tracking-wide">Why suggest this?</p>
                <p className="text-xs text-base-content/80 leading-relaxed font-medium">
                  The AI's top match is <strong className="text-base-content">{cdss.recommendation.rationale.find(r => r.startsWith("Primary:"))?.replace("Primary: ", "") || "unclear"}</strong> 
                  {" "}with a confidence of <strong className="text-base-content">{
                    fmtPct(parseFloat(cdss.recommendation.rationale.find(r => r.startsWith("Confidence:"))?.replace("Confidence: ", "") || "0"))
                  }</strong>.
                </p>
                <details className="mt-2 text-xs group">
                  <summary className="cursor-pointer text-base-content/60 hover:text-base-content font-medium transition-colors list-none flex items-center gap-1">
                    <span className="group-open:hidden flex items-center gap-1"><ChevronDown className="w-3 h-3" /> View raw rationale</span>
                    <span className="hidden group-open:flex items-center gap-1"><ChevronUp className="w-3 h-3" /> Hide raw rationale</span>
                  </summary>
                  <ul className="mt-2 ml-4 list-disc text-base-content/60 space-y-1">
                    {cdss.recommendation.rationale.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Differential */}
      {cdss.differential && cdss.differential.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold flex items-center gap-2 text-base-content uppercase tracking-wide">
              <FileText className="w-4 h-4 text-base-content/70" />
              Other conditions considered
            </h4>
            <button
              type="button"
              className="btn btn-ghost btn-xs text-base-content/60 hover:text-base-content font-medium"
              onClick={() => setShowDifferential((s) => !s)}
              aria-expanded={showDifferential}
            >
              {showDifferential ? (
                <>Hide details <ChevronUp className="w-3.5 h-3.5 ml-1" /></>
              ) : (
                <>Show details <ChevronDown className="w-3.5 h-3.5 ml-1" /></>
              )}
            </button>
          </div>
          
          {showDifferential ? (
            <div className="rounded-lg border border-base-300 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="table table-sm table-zebra w-full text-sm">
                  <thead className="bg-base-200/80 text-base-content/80">
                    <tr>
                      <th className="font-bold">Condition</th>
                      {hasAnyCodes && <th className="font-bold">Code</th>}
                      <th className="font-bold min-w-[150px]">Likelihood</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cdss.differential.map((d, idx) => (
                      <tr key={idx}>
                        <td className="font-semibold text-base-content/90">{d.label}</td>
                        {hasAnyCodes && (
                          <td className="font-mono text-xs text-base-content/60">
                            {d.code ?? "-"}
                          </td>
                        )}
                        <td className="w-1/3 min-w-[150px]">
                          <div className="flex items-center gap-3">
                            <span className="w-10 text-right text-xs font-bold text-base-content/80">{fmtPct(d.prob)}</span>
                            <progress 
                              className={`progress w-full ${getProbabilityColor(d.prob)} bg-base-200`} 
                              value={d.prob * 100} 
                              max="100"
                            ></progress>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-base-content/70 bg-base-200/40 rounded-lg p-3 border border-base-200 font-medium">
              We consider multiple possibilities before giving guidance. 
              The detailed list is hidden by default to keep things simple, but is available above.
            </p>
          )}
        </div>
      )}

      {/* Knowledge */}
      {cdss.knowledge && cdss.knowledge.length > 0 && (
        <div className="mb-2">
          <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-base-content uppercase tracking-wide">
            <BookOpen className="w-4 h-4 text-base-content/70" />
            Learn more
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {cdss.knowledge.map((k, idx) => (
              <a
                key={idx}
                href={k.link ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col justify-between rounded-lg border border-base-300 bg-base-100 p-4 hover:border-primary/50 hover:bg-primary/5 transition-all shadow-sm hover:shadow-md"
              >
                <div className="text-sm font-bold text-base-content/90 transition-colors group-hover:text-primary leading-snug">
                  {k.topic}
                </div>
                {k.source && (
                  <div className="mt-3 text-xs font-semibold text-base-content/60 flex items-center gap-2">
                    Source: <span className="badge badge-sm badge-neutral font-bold">{k.source}</span>
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Technical Details Collapse */}
      {cdss.meta?.model && (
        <div className="mt-6 border-t border-base-200 pt-4">
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-base-content/40 hover:text-base-content/70 transition-colors w-full text-left"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            aria-expanded={showTechnicalDetails}
          >
            <Info className="w-3 h-3" />
            Technical & Model Details
            {showTechnicalDetails ? (
              <ChevronUp className="w-3 h-3 ml-auto" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-auto" />
            )}
          </button>
          
          <div className={`mt-3 grid gap-2 overflow-hidden transition-all duration-300 ease-in-out ${showTechnicalDetails ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0'}`}>
            <div className="rounded-lg border border-base-200 bg-base-200/30 p-4 shadow-inner">
              <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div>
                  <dt className="text-base-content/60 font-medium mb-1 uppercase tracking-wide text-[10px]">Model Name</dt>
                  <dd className="font-mono font-semibold text-base-content/80 text-sm">{cdss.meta.model}</dd>
                </div>
                
                {cdss.meta.model_version && (
                  <div>
                    <dt className="text-base-content/60 font-medium mb-1 uppercase tracking-wide text-[10px]">Model Version / Path</dt>
                    <dd className="font-mono text-base-content/80 truncate" title={cdss.meta.model_version}>{cdss.meta.model_version}</dd>
                  </div>
                )}
                
                {cdss.meta.thresholds && Object.entries(cdss.meta.thresholds).map(([key, val]) => (
                  <div key={key}>
                    <dt className="text-base-content/60 font-medium mb-1 uppercase tracking-wide text-[10px]">{key.replace(/_/g, " ")}</dt>
                    <dd className="font-mono font-medium text-base-content/80">{val}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer footer */}
      <footer className="mt-5 rounded-lg bg-base-200/50 border border-base-200 px-4 py-3 text-xs text-base-content/60 font-medium text-center">
        This summary supports clinical decision-making. It does not replace
        professional medical judgment.
      </footer>
    </Card>
  );
};

export default CDSSSummary;
