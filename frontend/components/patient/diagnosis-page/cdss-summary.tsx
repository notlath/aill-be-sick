"use client";

import React, { useState } from "react";
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
  FileText,
  ExternalLink,
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

const getTriageLevel = (level: string) => {
  switch (level.toUpperCase()) {
    case "EMERGENT":
    case "URGENT":
    case "HIGH":
      return {
        badgeClass: "badge-error",
        accentColor: "var(--color-error)",
        bgColor: "bg-error/10",
        borderColor: "border-error/20",
        textColor: "text-error",
        barColor: "var(--color-error)",
        label: level,
      };
    case "MODERATE":
    case "MEDIUM":
      return {
        badgeClass: "badge-warning",
        accentColor: "var(--color-warning)",
        bgColor: "bg-warning/10",
        borderColor: "border-warning/20",
        textColor: "text-warning",
        barColor: "var(--color-warning)",
        label: level,
      };
    case "LOW":
    case "NON-URGENT":
      return {
        badgeClass: "badge-info",
        accentColor: "var(--color-info)",
        bgColor: "bg-info/10",
        borderColor: "border-info/20",
        textColor: "text-info",
        barColor: "var(--color-info)",
        label: level,
      };
    default:
      return {
        badgeClass: "badge-outline",
        accentColor: "var(--color-base-content)",
        bgColor: "bg-base-200",
        borderColor: "border-base-300",
        textColor: "text-base-content/80",
        barColor: "var(--color-base-content)",
        label: level,
      };
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

const formatTimestamp = (date: Date): string =>
  date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

// ── Component ──────────────────────────────────────────────────────────────

const CDSSSummary = ({
  cdss,
  generatedAt,
  confidence,
  uncertainty,
}: CDSSSummaryProps) => {
  if (!cdss) return null;

  const timestamp = generatedAt ? new Date(generatedAt) : null;
  const [showDifferential, setShowDifferential] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const hasAnyCodes = cdss.differential?.some((d) => d.code) ?? false;
  const triage = cdss.triage ? getTriageLevel(cdss.triage.level) : null;

  const isUncertain =
    (typeof confidence === "number" && confidence < 0.95) ||
    (typeof uncertainty === "number" && uncertainty > 0.05);

  return (
    <>
      {/* Fonts inherited from layout */}
      <style>{`
        .cdss-card { font-family: var(--font-geist-sans), 'Geist Fallback'; }
        .cdss-card .cdss-heading { font-family: var(--font-geist-sans), 'Geist Fallback'; }
      `}</style>

      <Card className="cdss-card border border-primary/20 bg-base-100 shadow-sm rounded-2xl overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-4 border-b border-base-300 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Activity className="w-4.5 h-4.5 text-primary" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="cdss-heading text-base font-700 text-base-content leading-tight" style={{ fontWeight: 700 }}>
                Clinical Support Summary
              </h3>
              <p className="text-[11px] text-base-content/50 font-medium tracking-wide uppercase mt-0.5">
                AI-assisted decision support
              </p>
            </div>
          </div>
          {timestamp && (
            <time
              dateTime={timestamp.toISOString()}
              className="text-[11px] text-base-content/50 font-mono tabular-nums flex-shrink-0"
            >
              {formatTimestamp(timestamp)}
            </time>
          )}
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* ── Uncertainty Warning ──────────────────────────────── */}
          {isUncertain && (
            <div className="flex gap-3 rounded-xl bg-warning/10 border border-warning/20 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" strokeWidth={2.5} />
              <div>
                <p className="cdss-heading text-sm font-700 text-warning leading-snug" style={{ fontWeight: 700 }}>
                  Low model confidence
                </p>
                <p className="text-xs text-warning mt-0.5 leading-relaxed">
                  The AI is not highly confident in this assessment. Interpret the following with caution and prioritize clinical judgment.
                </p>
              </div>
            </div>
          )}

          {/* ── Triage — Clinical Hero ───────────────────────────── */}
          {cdss.triage && triage && (
            <section aria-label="Triage level">
              <SectionLabel icon={<ShieldAlert className="w-3.5 h-3.5" strokeWidth={2.5} />} label="Urgency" />
              <div
                className={`mt-2 rounded-xl border ${triage.borderColor} ${triage.bgColor} overflow-hidden`}
              >
                {/* Accent bar */}
                <div className="h-1 w-full" style={{ backgroundColor: triage.accentColor }} />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className={`badge badge-lg ${triage.badgeClass} font-bold tracking-wide cdss-heading flex-shrink-0`}>
                      {triage.label}
                    </span>
                    <p className={`text-sm font-semibold ${triage.textColor} leading-snug pt-1`}>
                      {getTriageDescription(cdss.triage.level)}
                    </p>
                  </div>
                  {cdss.triage.reasons && cdss.triage.reasons.length > 0 && (
                    <ul className="mt-3 space-y-1.5 pl-1">
                      {cdss.triage.reasons.map((r, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-base-content/70">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: triage.accentColor }} />
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── Red Flags ────────────────────────────────────────── */}
          {cdss.red_flags && cdss.red_flags.length > 0 && (
            <section role="alert" aria-live="assertive">
              <SectionLabel
                icon={<AlertTriangle className="w-3.5 h-3.5 text-error" strokeWidth={2.5} />}
                label="Warning signs detected"
                labelClassName="text-error"
              />
              <p className="text-xs text-base-content/60 mt-1 mb-2.5">
                Based on your reported symptoms, we noted the following:
              </p>
              <div className="flex flex-wrap gap-2">
                {cdss.red_flags.map((rf, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error/10 border border-error/20 text-error text-xs font-semibold"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-error flex-shrink-0" />
                    {rf}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* ── Recommendation / Next Steps ──────────────────────── */}
          {cdss.recommendation && (
            <section>
              <SectionLabel icon={<ListChecks className="w-3.5 h-3.5" strokeWidth={2.5} />} label="What to do next" />

              <div className="mt-2 space-y-3">
                {/* Care setting callout */}
                {cdss.recommendation.care_setting && (
                  <div className="flex items-center gap-3 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/20 rounded-md px-2 py-1 flex-shrink-0">
                      Care Setting
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      {cdss.recommendation.care_setting}
                    </span>
                  </div>
                )}

                {/* Numbered action steps */}
                {cdss.recommendation.actions &&
                  cdss.recommendation.actions.length > 0 && (
                    <ol className="space-y-2.5">
                      {cdss.recommendation.actions.map((a, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 cdss-heading">
                            {idx + 1}
                          </span>
                          <span className="text-sm text-base-content/80 leading-relaxed pt-0.5">
                            {a}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}

                {/* Rationale */}
                {cdss.recommendation.rationale &&
                  cdss.recommendation.rationale.length > 0 && (
                    <div className="rounded-xl bg-base-200 border border-base-300 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-base-content/50 mb-2">
                        Why this recommendation?
                      </p>
                      <p className="text-xs text-base-content/70 leading-relaxed">
                        The AI&apos;s top match is{" "}
                        <strong className="text-base-content font-semibold">
                          {cdss.recommendation.rationale
                            .find((r) => r.startsWith("Primary:"))
                            ?.replace("Primary: ", "") || "unclear"}
                        </strong>{" "}
                        with a confidence of{" "}
                        <strong className="text-base-content font-semibold">
                          {fmtPct(
                            parseFloat(
                              cdss.recommendation.rationale
                                .find((r) => r.startsWith("Confidence:"))
                                ?.replace("Confidence: ", "") || "0"
                            )
                          )}
                        </strong>
                        .
                      </p>
                      <details className="mt-2 group">
                        <summary className="cursor-pointer text-[11px] text-base-content/50 hover:text-base-content/70 font-medium transition-colors list-none flex items-center gap-1">
                          <span className="group-open:hidden flex items-center gap-1">
                            <ChevronDown className="w-3 h-3" /> View raw rationale
                          </span>
                          <span className="hidden group-open:flex items-center gap-1">
                            <ChevronUp className="w-3 h-3" /> Hide raw rationale
                          </span>
                        </summary>
                        <ul className="mt-2 ml-3 space-y-1">
                          {cdss.recommendation.rationale.map((r, idx) => (
                            <li
                              key={idx}
                              className="text-[11px] text-base-content/60 flex items-start gap-1.5"
                            >
                              <span className="mt-1.5 w-1 h-1 rounded-full bg-base-300 flex-shrink-0" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )}
              </div>
            </section>
          )}

          {/* ── Differential Diagnoses ───────────────────────────── */}
          {cdss.differential && cdss.differential.length > 0 && (
            <section>
              <div className="flex items-center justify-between">
                <SectionLabel
                  icon={<FileText className="w-3.5 h-3.5" strokeWidth={2.5} />}
                  label="Other conditions considered"
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-xs text-base-content/50 hover:text-base-content/80 font-medium cursor-pointer"
                  onClick={() => setShowDifferential((s) => !s)}
                  aria-expanded={showDifferential}
                >
                  {showDifferential ? (
                    <>Hide <ChevronUp className="w-3.5 h-3.5 ml-0.5" /></>
                  ) : (
                    <>Show <ChevronDown className="w-3.5 h-3.5 ml-0.5" /></>
                  )}
                </button>
              </div>

              {showDifferential ? (
                <div className="mt-2 rounded-xl border border-base-300 overflow-hidden">
                  <table className="table table-sm w-full text-sm">
                    <thead>
                      <tr className="bg-base-200 border-b border-base-300">
                        <th className="text-[11px] font-bold uppercase tracking-widest text-base-content/50 py-2.5 px-4">
                          Condition
                        </th>
                        {hasAnyCodes && (
                          <th className="text-[11px] font-bold uppercase tracking-widest text-base-content/50 py-2.5 px-4">
                            Code
                          </th>
                        )}
                        <th className="text-[11px] font-bold uppercase tracking-widest text-base-content/50 py-2.5 px-4 min-w-[160px]">
                          Likelihood
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cdss.differential.map((d, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-base-200 last:border-0 ${idx === 0 ? "bg-primary/5" : "bg-base-100"}`}
                        >
                          <td className="py-3 px-4">
                            <span className={`text-sm font-semibold ${idx === 0 ? "text-primary" : "text-base-content/80"}`}>
                              {d.label}
                            </span>
                            {idx === 0 && (
                              <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/20 rounded px-1.5 py-0.5">
                                Top match
                              </span>
                            )}
                          </td>
                          {hasAnyCodes && (
                            <td className="py-3 px-4 font-mono text-xs text-base-content/50">
                              {d.code ?? "—"}
                            </td>
                          )}
                          <td className="py-3 px-4 w-1/3 min-w-[160px]">
                            <div className="flex items-center gap-2.5">
                              <span className="w-10 text-right text-xs font-bold text-base-content/60 tabular-nums">
                                {fmtPct(d.prob)}
                              </span>
                              <div className="flex-1 h-1.5 rounded-full bg-base-300 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${(d.prob * 100).toFixed(1)}%`,
                                    backgroundColor:
                                      d.prob >= 0.7
                                        ? "var(--color-error)"
                                        : d.prob >= 0.3
                                          ? "var(--color-warning)"
                                          : "var(--color-info)",
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-2 text-xs text-base-content/60 bg-base-200 rounded-xl border border-base-300 px-4 py-3 leading-relaxed">
                  We evaluate multiple possibilities before giving guidance. The
                  full list is hidden by default to keep things simple.
                </p>
              )}
            </section>
          )}

          {/* ── Knowledge Links ──────────────────────────────────── */}
          {cdss.knowledge && cdss.knowledge.length > 0 && (
            <section>
              <SectionLabel
                icon={<BookOpen className="w-3.5 h-3.5" strokeWidth={2.5} />}
                label="Learn more"
              />
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {cdss.knowledge.map((k, idx) => (
                  <a
                    key={idx}
                    href={k.link ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start justify-between gap-3 rounded-xl border-l-2 border border-primary/30 bg-base-100 px-4 py-3 hover:bg-primary/10 hover:border-l-primary hover:border-primary/30 transition-all duration-150 cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-semibold text-base-content/80 group-hover:text-primary transition-colors leading-snug">
                        {k.topic}
                      </p>
                      {k.source && (
                        <p className="mt-1.5 text-[11px] text-base-content/50 font-medium">
                          Source:{" "}
                          <span className="font-bold text-base-content/60">
                            {k.source}
                          </span>
                        </p>
                      )}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-base-content/40 group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" strokeWidth={2} />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* ── Technical Details ────────────────────────────────── */}
          {cdss.meta?.model && (
            <div className="border-t border-base-300 pt-4">
              <button
                type="button"
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-base-content/40 hover:text-base-content/60 transition-colors w-full text-left cursor-pointer"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                aria-expanded={showTechnicalDetails}
              >
                <Info className="w-3 h-3" />
                Technical &amp; Model Details
                {showTechnicalDetails ? (
                  <ChevronUp className="w-3 h-3 ml-auto" />
                ) : (
                  <ChevronDown className="w-3 h-3 ml-auto" />
                )}
              </button>

              <div
                className={`mt-3 overflow-hidden transition-all duration-300 ease-in-out ${showTechnicalDetails ? "opacity-100 max-h-96" : "opacity-0 max-h-0"}`}
              >
                <div className="rounded-xl border border-base-300 bg-base-200 p-4">
                  <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-xs divide-y divide-base-300 sm:divide-y-0">
                    <div className="pt-2 sm:pt-0">
                      <dt className="text-[10px] font-bold uppercase tracking-widest text-base-content/50 mb-1">
                        Model Name
                      </dt>
                      <dd className="font-mono font-semibold text-base-content/80">
                        {cdss.meta.model}
                      </dd>
                    </div>

                    {cdss.meta.model_version && (
                      <div className="pt-2 sm:pt-0">
                        <dt className="text-[10px] font-bold uppercase tracking-widest text-base-content/50 mb-1">
                          Version / Path
                        </dt>
                        <dd
                          className="font-mono text-base-content/70 truncate"
                          title={cdss.meta.model_version}
                        >
                          {cdss.meta.model_version}
                        </dd>
                      </div>
                    )}

                    {cdss.meta.thresholds &&
                      Object.entries(cdss.meta.thresholds).map(
                        ([key, val]) => (
                          <div key={key} className="pt-2 sm:pt-0">
                            <dt className="text-[10px] font-bold uppercase tracking-widest text-base-content/50 mb-1">
                              {key.replace(/_/g, " ")}
                            </dt>
                            <dd className="font-mono font-medium text-base-content/70">
                              {val}
                            </dd>
                          </div>
                        )
                      )}
                  </dl>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Disclaimer Footer ─────────────────────────────────── */}
        <footer className="px-6 py-3 bg-primary/5 border-t border-primary/20 text-center">
          <p className="text-[11px] text-primary/70 leading-relaxed italic">
            This summary supports clinical decision-making and does not replace professional medical judgment.
          </p>
        </footer>
      </Card>
    </>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────

const SectionLabel = ({
  icon,
  label,
  labelClassName = "text-base-content/60",
}: {
  icon: React.ReactNode;
  label: string;
  labelClassName?: string;
}) => (
  <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest ${labelClassName}`}>
    <span className="text-inherit opacity-70">{icon}</span>
    {label}
  </div>
);

export default CDSSSummary;
