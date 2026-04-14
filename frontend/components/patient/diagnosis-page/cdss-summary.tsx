"use client";

import { Card } from "@/components/ui/card";
import LazyMarkdown from "@/components/ui/lazy-markdown";
import { getSymptomLabelMap } from "@/constants/clinical-verification-protocols";
import {
  Activity,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  ExternalLink,
  Lightbulb,
  ListChecks,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import React from "react";

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
  extracted_symptoms?: string[];
};

type CDSSSummaryProps = {
  cdss: CDSSPayload;
  /** ISO-8601 string or Date. Falls back to component render time when absent. */
  generatedAt?: string | Date;
  confidence?: number;
  uncertainty?: number;
  /** Indicates if a confident diagnosis was reached (false = unable to diagnose) */
  isValid?: boolean;
  /** The diagnosis message from the chat (e.g. "Based on what you've told us, it could be Measles...") */
  diagnosisMessage?: string | null;
  /** Result of clinical symptom verification protocol validation */
  verificationStatus?: string | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────

const getTriageLevel = (level: string) => {
  switch (level.toUpperCase()) {
    case "HIGH PRIORITY":
    case "HIGH":
    case "RED":
    case "EMERGENT":
    case "URGENT":
      return {
        badgeClass: "badge-error",
        accentColor: "var(--color-error)",
        bgColor: "bg-error/10",
        borderColor: "border-error/20",
        textColor: "text-error",
        barColor: "var(--color-error)",
        label: level,
      };
    case "MEDIUM PRIORITY":
    case "MEDIUM":
    case "YELLOW":
    case "MODERATE":
      return {
        badgeClass: "badge-warning",
        accentColor: "var(--color-warning)",
        bgColor: "bg-warning/10",
        borderColor: "border-warning/20",
        textColor: "text-warning",
        barColor: "var(--color-warning)",
        label: level,
      };
    case "LOW PRIORITY":
    case "LOW":
    case "GREEN":
    case "NON-URGENT":
      return {
        badgeClass: "badge-success",
        accentColor: "var(--color-success)",
        bgColor: "bg-success/10",
        borderColor: "border-success/20",
        textColor: "text-success",
        barColor: "var(--color-success)",
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
    case "HIGH PRIORITY":
    case "HIGH":
    case "RED":
    case "EMERGENT":
    case "URGENT":
      return "Seek medical attention promptly. Physician evaluation recommended.";
    case "MEDIUM PRIORITY":
    case "MEDIUM":
    case "YELLOW":
    case "MODERATE":
      return "Please consult a healthcare professional within 24 hours for clinical assessment.";
    case "LOW PRIORITY":
    case "LOW":
    case "GREEN":
    case "NON-URGENT":
      return "Safe for home care and monitoring. Schedule routine follow-up if symptoms persist.";
    default:
      return "Please consult a healthcare provider for clinical evaluation.";
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
  isValid,
  diagnosisMessage,
  verificationStatus,
}: CDSSSummaryProps) => {
  if (!cdss) return null;

  const timestamp = generatedAt ? new Date(generatedAt) : null;
  const triage = cdss.triage ? getTriageLevel(cdss.triage.level) : null;

  const handleViewInsights = () => {
    const modal = document.getElementById("insights_modal");
    if (modal) {
      (modal as HTMLDialogElement).showModal();
    }
  };

  const symptomMap = getSymptomLabelMap();
  const extractedSymptomLabels = React.useMemo(() => {
    if (!cdss.extracted_symptoms || cdss.extracted_symptoms.length === 0)
      return [];
    return cdss.extracted_symptoms.map((qid) => symptomMap[qid] || qid).sort();
  }, [cdss.extracted_symptoms, symptomMap]);

  return (
    <>
      <Card className="cdss-card border border-base-300 bg-base-100 shadow-sm rounded-2xl overflow-hidden">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-4 border-b border-base-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-base-200 flex items-center justify-center flex-shrink-0">
              <Activity
                className="w-4.5 h-4.5 text-base-content/60"
                strokeWidth={2.5}
              />
            </div>
            <div>
              <h3
                className="cdss-heading text-base font-700 text-base-content leading-tight"
                style={{ fontWeight: 700 }}
              >
                Your results
              </h3>
              {diagnosisMessage && (
                <div className="text-sm text-base-content/70 mt-1 leading-relaxed">
                  <LazyMarkdown
                    components={{
                      p: ({ children }: any) => (
                        <p className="my-0">{children}</p>
                      ),
                      strong: ({ children }: any) => (
                        <strong className="font-bold">{children}</strong>
                      ),
                    }}
                  >
                    {diagnosisMessage}
                  </LazyMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Unconfirmed Verification Alert ────────────────────── */}
        {verificationStatus === "UNCONFIRMED" && (
          <div className="mx-6 mt-5 bg-error/10 text-error border border-error/20 rounded-xl flex items-start gap-3 p-4">
            <ShieldAlert className="size-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">
                Clinical Verification Failed
              </h4>
              <p className="text-sm opacity-90 mt-0.5 leading-relaxed">
                The reported symptoms do not strongly match the expected
                protocol pattern for this condition.
              </p>
            </div>
          </div>
        )}

        <div className="px-6 py-4 space-y-4">
          {/* ── Verification Notice ──────────────────────────────── */}
          <div className="flex gap-3 rounded-xl bg-info/10 border border-info/20 px-4 py-3">
            <MapPin
              className="w-5 h-5 text-info flex-shrink-0 mt-0.5"
              strokeWidth={2.5}
            />
            <div>
              <p className="text-sm font-semibold text-info leading-snug">
                Next step: get your results verified
              </p>
              <p className="text-xs text-base-content/70 mt-1 leading-relaxed">
                This assessment is a helpful starting point, but it's not a
                substitute for a doctor's visit. Head to the Bagong Silangan
                Health Center for a check-up so a healthcare provider can review
                your results and guide your next steps.
              </p>
            </div>
          </div>

          {/* ── Triage — Urgency ─────────────────────────────────── */}
          {cdss.triage && triage && (
            <section aria-label="Triage level">
              <SectionLabel
                icon={<ShieldAlert className="w-4 h-4" strokeWidth={2.5} />}
                label="How urgent is this?"
              />
              <div
                className={`mt-2 rounded-xl border ${triage.borderColor} ${triage.bgColor} overflow-hidden`}
              >
                <div className="px-4 py-3">
                  <div className="flex flex-col gap-2.5">
                    <span
                      className={`badge badge-sm ${triage.badgeClass} font-semibold tracking-wide flex-shrink-0 w-fit`}
                    >
                      {triage.label}
                    </span>
                    <p
                      className={`text-sm text-base-content/80 leading-snug`}
                    >
                      {getTriageDescription(cdss.triage.level)}
                    </p>
                  </div>
                  {cdss.triage.reasons && cdss.triage.reasons.length > 0 && (
                    <div className="mt-3">
                      <details className="group">
                        <summary className="flex cursor-pointer items-center text-sm font-medium text-base-content/70 hover:text-base-content/90 transition-colors">
                          <span className="mr-1.5 text-xs inline-block transition-transform group-open:rotate-90">
                            ▶
                          </span>
                          Show clinical reasoning
                        </summary>
                        <ul className="mt-3 space-y-2 pl-4 border-l-2 border-base-300/50 ml-1.5">
                          {cdss.triage.reasons
                            .filter((r) => {
                              // Skip technical/internal reasons that don't help patients
                              const skipPatterns = [
                                /high model confidence/i,
                                /low uncertainty/i,
                                /safe for automated/i,
                                /without human review/i,
                                /confidence.*\d+%/i,
                                /uncertainty.*\d+%/i,
                              ];
                              return !skipPatterns.some((p) => p.test(r));
                            })
                            .map((r, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 text-sm text-base-content/80 leading-snug"
                              >
                                <span
                                  className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: triage.accentColor }}
                                />
                                {r}
                              </li>
                            ))}
                        </ul>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── Recommendation / Next Steps ──────────────────────── */}
          {cdss.recommendation && (
            <section>
              <SectionLabel
                icon={<ListChecks className="w-4 h-4" strokeWidth={2.5} />}
                label="What to do next"
              />

              <div className="mt-2 space-y-3">
                {/* Numbered action steps */}
                {cdss.recommendation.actions &&
                  cdss.recommendation.actions.length > 0 && (
                    <ol className="space-y-2.5">
                      {cdss.recommendation.actions.map((a, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-base-200 border border-base-300 text-base-content/70 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 cdss-heading">
                            {idx + 1}
                          </span>
                          <span className="text-sm text-base-content/80 leading-relaxed pt-0.5">
                            {a}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
              </div>
            </section>
          )}

          {/* ── Extracted Symptoms ───────────────────────────────── */}
          {extractedSymptomLabels.length > 0 && (
            <section>
              <SectionLabel
                icon={<ClipboardList className="w-4 h-4" strokeWidth={2.5} />}
                label="Identified symptoms"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {extractedSymptomLabels.map((symptom, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1.5 rounded-md bg-base-200 border border-base-300 text-xs font-medium text-base-content/80 text-center leading-none"
                  >
                    {symptom}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* ── Knowledge Links ──────────────────────────────────── */}
          {cdss.knowledge && cdss.knowledge.length > 0 && (
            <section>
              <SectionLabel
                icon={<BookOpen className="w-4 h-4" strokeWidth={2.5} />}
                label="Learn more"
              />
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {cdss.knowledge.map((k, idx) => (
                  <a
                    key={idx}
                    href={k.link ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start justify-between gap-3 rounded-xl border-l-2 border border-base-300 bg-base-100 px-4 py-3 hover:bg-base-200 hover:border-l-base-content/40 transition-all duration-150 cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-semibold text-base-content/80 group-hover:text-base-content transition-colors leading-snug">
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
                    <ExternalLink
                      className="w-3.5 h-3.5 text-base-content/40 group-hover:text-base-content/70 transition-colors flex-shrink-0 mt-0.5"
                      strokeWidth={2}
                    />
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Action: See what influenced this result ────────────── */}
        <div className="px-6 py-4 border-t border-base-300">
          <button
            type="button"
            className="flex items-center justify-center gap-2 w-full border border-base-300 btn cursor-pointer"
            onClick={handleViewInsights}
          >
            <Lightbulb className="w-4 h-4" />
            See what influenced this result
          </button>
        </div>

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
  <div
    className={`flex items-center gap-2 text-sm font-semibold ${labelClassName}`}
  >
    <span className="text-inherit opacity-70">{icon}</span>
    {label}
  </div>
);

export default CDSSSummary;
