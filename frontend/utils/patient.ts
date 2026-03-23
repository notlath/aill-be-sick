/**
 * Generate an anonymized patient identifier for privacy compliance.
 * Format: "P-XXXXX" where XXXXX is a hash derived from the user ID.
 * This allows clinicians to track cases without exposing patient names.
 */
export function getAnonymizedPatientId(userId: number): string {
  // Use a simple hash to create a consistent but anonymized identifier
  const hash = Math.abs(userId * 2654435761) % 100000;
  return `P-${hash.toString().padStart(5, "0")}`;
}
