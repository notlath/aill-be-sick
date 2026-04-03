import { RELIABILITY_THRESHOLDS } from "@/constants/reliability-thresholds";

export function getReliability(
  confidence: number,
  uncertainty: number
): { label: string; badgeClass: string; rank: number } {
  if (
    confidence >= RELIABILITY_THRESHOLDS.reliable.minConfidence &&
    uncertainty < RELIABILITY_THRESHOLDS.reliable.maxUncertainty
  ) {
    return { label: "Reliable", badgeClass: "badge-success", rank: 3 };
  }
  if (
    confidence >= RELIABILITY_THRESHOLDS.reviewRecommended.minConfidence &&
    uncertainty <= RELIABILITY_THRESHOLDS.reviewRecommended.maxUncertainty
  ) {
    return { label: "Review Recommended", badgeClass: "badge-warning", rank: 2 };
  }
  return { label: "Expert Review Needed", badgeClass: "badge-error", rank: 1 };
}
