export function getReliability(
  confidence: number,
  uncertainty: number
): { label: string; badgeClass: string; rank: number } {
  if (confidence >= 0.9 && uncertainty < 0.03) {
    return { label: "Reliable", badgeClass: "badge-success", rank: 3 };
  }
  if (confidence >= 0.7 && uncertainty <= 0.08) {
    return { label: "Review Recommended", badgeClass: "badge-warning", rank: 2 };
  }
  return { label: "Expert Review Needed", badgeClass: "badge-error", rank: 1 };
}
