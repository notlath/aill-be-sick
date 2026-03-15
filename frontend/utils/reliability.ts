export function getReliability(
  confidence: number,
  uncertainty: number
): { label: string; badgeClass: string } {
  if (confidence >= 0.9 && uncertainty < 0.03) {
    return { label: "Reliable", badgeClass: "badge-success" };
  }
  if (confidence >= 0.7 && uncertainty <= 0.08) {
    return { label: "Review Recommended", badgeClass: "badge-warning" };
  }
  return { label: "Expert Review Needed", badgeClass: "badge-error" };
}
