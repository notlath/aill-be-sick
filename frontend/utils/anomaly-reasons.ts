/**
 * Anomaly score level definitions for Isolation Forest anomaly detection.
 *
 * Isolation Forest returns a score where:
 *   - Negative scores indicate anomalies (more negative = more anomalous)
 *   - Scores >= 0 are considered normal
 *
 * This module converts raw scores to human-readable levels for clinicians.
 */

export type AnomalyLevel = "high" | "medium" | "low";

export const ANOMALY_LEVELS: Record<
  AnomalyLevel,
  { label: string; description: string }
> = {
  high: {
    label: "High",
    description: "Strong anomaly - warrants immediate investigation",
  },
  medium: {
    label: "Medium",
    description: "Moderate anomaly - should be reviewed",
  },
  low: {
    label: "Low",
    description: "Mild anomaly - borderline case",
  },
};

/**
 * Convert an Isolation Forest anomaly score to a human-readable level.
 *
 * Thresholds (more negative = more anomalous):
 *   - High: score < -0.15 (strong anomaly)
 *   - Medium: -0.15 <= score < 0 (mild anomaly)
 *   - Low: score >= 0 (borderline / barely flagged)
 */
export function getAnomalyLevel(score: number): AnomalyLevel {
  if (score < -0.15) return "high";
  if (score < 0) return "medium";
  return "low";
}

/**
 * Get the label for an anomaly level (e.g., "High", "Medium", "Low")
 */
export function getAnomalyLevelLabel(score: number): string {
  return ANOMALY_LEVELS[getAnomalyLevel(score)].label;
}

/**
 * Get the DaisyUI badge color class for an anomaly level.
 */
export function getAnomalyLevelBadgeClass(score: number): string {
  const level = getAnomalyLevel(score);
  switch (level) {
    case "high":
      return "badge-error"; // Red for high priority
    case "medium":
      return "badge-warning"; // Yellow for medium
    case "low":
      return "badge-info"; // Blue for low
  }
}

/**
 * Reason code definitions for Isolation Forest anomaly detection.
 *
 * The backend produces pipe-separated reason codes on each anomalous record,
 * e.g. "GEOGRAPHIC:RARE|TEMPORAL:RARE|COMBINED:MULTI".
 *
 * This module maps each code to:
 *   - a short label (for badges / chips)
 *   - a plain-language description for healthcare workers
 */

export const REASON_CODES = {
  "GEOGRAPHIC:RARE": {
    label: "Unusual location",
    description:
      "This disease is rarely reported in this geographic area. The location of this case stands out compared to other records.",
  },
  "TEMPORAL:RARE": {
    label: "Unusual timing",
    description:
      "This case was recorded at an unusual time of year for this disease. It does not follow the typical seasonal pattern.",
  },
  "CLUSTER:SPATIAL": {
    label: "Spatial group",
    description:
      "There is an unusual concentration of cases in this specific location. Multiple cases are being reported from the same area.",
  },
  "CONFIDENCE:LOW": {
    label: "Low confidence",
    description:
      "The system had low confidence when making this diagnosis. The result may be less reliable and warrants further review.",
  },
  "UNCERTAINTY:HIGH": {
    label: "High uncertainty",
    description:
      "The system reported high uncertainty for this diagnosis. The findings should be interpreted with caution.",
  },
  "COMBINED:MULTI": {
    label: "Multiple factors",
    description:
      "Two or more independent factors contributed to this record being flagged. Please review all contributing reasons.",
  },
  "AGE:RARE": {
    label: "Unusual age",
    description:
      "This patient's age is outside the typical range for people diagnosed with this disease. The age may warrant further consideration.",
  },
  "GENDER:RARE": {
    label: "Unusual gender",
    description:
      "This patient's gender is uncommon among people diagnosed with this disease. This pattern may be worth noting during review.",
  },
  "OUTBREAK:EPIDEMIC_THRESHOLD": {
    label: "Epidemic Threshold",
    description:
      "The case volume has exceeded the DOH PIDSR Epidemic Threshold (mean + 2 standard deviations), indicating a significant outbreak that requires immediate response.",
  },
  "OUTBREAK:ALERT_THRESHOLD": {
    label: "Alert Threshold",
    description:
      "The case volume has exceeded the DOH PIDSR Alert Threshold (mean + 1 standard deviation), signaling elevated disease activity that requires increased surveillance.",
  },
  "CLUSTER:DENSE": {
    label: "Dense Cluster",
    description:
      "A high-density spatial cluster of similar cases has been detected in a localized area.",
  },
  "OUTBREAK:VOL_SPIKE": {
    label: "Volume Spike",
    description:
      "A sudden, significant increase in case volume compared to historical baselines.",
  },
} as const;

export type ReasonCode = keyof typeof REASON_CODES;

/**
 * Parse a pipe-separated reason string into an array of known reason codes.
 * Unknown codes are returned as-is.
 */
export function parseReasonCodes(reason: string | null): string[] {
  if (!reason) return [];
  return reason.split("|").filter(Boolean);
}

/**
 * Return the short label for a reason code.
 * Falls back to the raw code string if not recognised.
 */
export function getReasonLabel(code: string): string {
  return (REASON_CODES as Record<string, { label: string; description: string }>)[code]
    ?.label ?? code;
}

/**
 * Return the plain-language description for a reason code.
 * Falls back to the raw code string if not recognised.
 */
export function getReasonDescription(code: string): string {
  return (REASON_CODES as Record<string, { label: string; description: string }>)[code]
    ?.description ?? code;
}

/**
 * Build a full human-readable summary from a pipe-separated reason string.
 * Returns an empty string when reason is null / empty.
 */
export function getReasonSummary(reason: string | null): string {
  const codes = parseReasonCodes(reason);
  if (codes.length === 0) return "";
  return codes.map(getReasonDescription).join(" ");
}
