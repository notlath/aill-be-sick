/**
 * Maps anomaly reason codes from the surveillance service to an alert severity.
 *
 * Severity rules (evaluated in priority order):
 *  - CRITICAL : CLUSTER:SPATIAL and COMBINED:MULTI both present (spatial cluster
 *               with multiple contributing factors — strongest outbreak signal)
 *  - HIGH     : CLUSTER:SPATIAL alone, or COMBINED:MULTI with ≥ 3 codes
 *  - LOW      : any other single reason code
 */

export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export function mapReasonCodesToSeverity(reasonCodes: string[]): AlertSeverity {
  const has = (code: string) => reasonCodes.includes(code);

  if (has("OUTBREAK:EPIDEMIC_THRESHOLD") || (has("CLUSTER:SPATIAL") && has("COMBINED:MULTI"))) return "CRITICAL";
  if (has("OUTBREAK:ALERT_THRESHOLD") || has("CLUSTER:SPATIAL") || (has("COMBINED:MULTI") && reasonCodes.length >= 3))
    return "HIGH";
  if (has("CLUSTER:DENSE") || has("OUTBREAK:VOL_SPIKE")) return "MEDIUM";

  return "LOW";
}

/**
 * Returns the DaisyUI badge class for a given alert severity.
 */
export function getSeverityBadgeClass(severity: AlertSeverity): string {
  switch (severity) {
    case "CRITICAL":
      return "badge-error";
    case "HIGH":
      return "badge-warning";
    case "MEDIUM":
      return "badge-info";
    case "LOW":
      return "badge-ghost";
  }
}

/**
 * Returns a human-readable label for a given alert severity.
 */
export function getSeverityLabel(severity: AlertSeverity): string {
  switch (severity) {
    case "CRITICAL":
      return "Critical";
    case "HIGH":
      return "High";
    case "MEDIUM":
      return "Medium";
    case "LOW":
      return "Low";
  }
}
