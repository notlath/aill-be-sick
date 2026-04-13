/**
 * Utility functions for computing anomaly statistics and summaries.
 * Used by the AnomalySummary component to display aggregated anomaly insights.
 */

import type { SurveillanceAnomaly } from "@/types";
import { parseReasonCodes, getReasonLabel } from "./anomaly-reasons";

/**
 * Distribution item for diseases, districts, or reason codes.
 */
export interface DistributionItem {
  label: string;
  count: number;
  percent: number;
}

/**
 * Computed anomaly statistics for display in summary cards.
 */
export interface AnomalyStatistics {
  // Reason code distribution
  reason_distribution: DistributionItem[];

  // Disease distribution within anomalies
  disease_distribution: DistributionItem[];

  // District distribution within anomalies
  district_distribution: DistributionItem[];

  // Region distribution within anomalies
  region_distribution: DistributionItem[];

  // Average statistics
  avg_anomaly_score: number;
  avg_confidence: number;
  avg_uncertainty: number;

  // Total count
  total_anomalies: number;
}

/**
 * Compute statistics from an array of anomalies.
 */
export function computeAnomalyStatistics(anomalies: SurveillanceAnomaly[]): AnomalyStatistics {
  const totalAnomalies = anomalies.length;
  
  // Initialize counters
  const reasonCounts = new Map<string, number>();
  const diseaseCounts = new Map<string, number>();
  const districtCounts = new Map<string, number>();
  const regionCounts = new Map<string, number>();

  let totalAnomalyScore = 0;
  let totalConfidence = 0;
  let totalUncertainty = 0;
  let validScoreCount = 0;
  let validConfidenceCount = 0;
  let validUncertaintyCount = 0;
  
  // Count occurrences
  for (const anomaly of anomalies) {
    // Reason codes (can be multiple per anomaly)
    if (anomaly.reason) {
      const codes = parseReasonCodes(anomaly.reason);
      for (const code of codes) {
        reasonCounts.set(code, (reasonCounts.get(code) ?? 0) + 1);
      }
    }
    
    // Disease
    diseaseCounts.set(anomaly.disease, (diseaseCounts.get(anomaly.disease) ?? 0) + 1);
    
    // District
    if (anomaly.district) {
      districtCounts.set(anomaly.district, (districtCounts.get(anomaly.district) ?? 0) + 1);
    }
    
    // Region
    if (anomaly.region) {
      regionCounts.set(anomaly.region, (regionCounts.get(anomaly.region) ?? 0) + 1);
    }
    
    // Numeric fields
    if (anomaly.anomaly_score != null) {
      totalAnomalyScore += anomaly.anomaly_score;
      validScoreCount++;
    }
    if (anomaly.confidence != null) {
      totalConfidence += anomaly.confidence;
      validConfidenceCount++;
    }
    if (anomaly.uncertainty != null) {
      totalUncertainty += anomaly.uncertainty;
      validUncertaintyCount++;
    }
  }
  
  // Helper to convert map to sorted distribution
  const mapToDistribution = (map: Map<string, number>): DistributionItem[] => {
    const entries = Array.from(map.entries())
      .map(([label, count]) => ({
        label,
        count,
        percent: totalAnomalies > 0 ? Math.round((count / totalAnomalies) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
    
    return entries;
  };
  
  return {
    reason_distribution: mapToDistribution(reasonCounts),
    disease_distribution: mapToDistribution(diseaseCounts),
    district_distribution: mapToDistribution(districtCounts),
    region_distribution: mapToDistribution(regionCounts),
    avg_anomaly_score: validScoreCount > 0 ? Math.round((totalAnomalyScore / validScoreCount) * 100) / 100 : 0,
    avg_confidence: validConfidenceCount > 0 ? Math.round((totalConfidence / validConfidenceCount) * 100) / 100 : 0,
    avg_uncertainty: validUncertaintyCount > 0 ? Math.round((totalUncertainty / validUncertaintyCount) * 100) / 100 : 0,
    total_anomalies: totalAnomalies,
  };
}

/**
 * Generate a narrative summary sentence describing the anomaly patterns.
 */
export function generateAnomalyNarrative(
  stats: AnomalyStatistics,
  selectedDisease: string
): string {
  const { total_anomalies, reason_distribution, disease_distribution, district_distribution } = stats;

  if (total_anomalies === 0) {
    return "No flagged cases detected for the selected criteria.";
  }

  const parts: string[] = [];

  // Start with count
  parts.push(`${total_anomalies} flagged case${total_anomalies === 1 ? "" : "s"}`);

  // Add district info if available
  if (district_distribution.length > 0) {
    const topDistrict = district_distribution[0];
    const isDominant = district_distribution.length > 1
      ? topDistrict.count > district_distribution[1].count * 1.4
      : true;

    if (isDominant) {
      parts.push(`primarily in **${topDistrict.label}**`);
    } else {
      parts.push(`across ${district_distribution.length} district${district_distribution.length > 1 ? "s" : ""}`);
    }
  }

  // Add top reason codes with proper labels
  if (reason_distribution.length > 0) {
    const topReasons = reason_distribution.slice(0, 2);
    const reasonLabels = topReasons.map(r => {
      // Use the human-readable label from the reason code
      const label = getReasonLabel(r.label);
      // Convert to lowercase for sentence flow
      return label.toLowerCase();
    });

    if (reasonLabels.length === 1) {
      parts.push(`mostly flagged for **${reasonLabels[0]}**`);
    } else if (reasonLabels.length >= 2) {
      parts.push(`flagged for **${reasonLabels.join(" and ")}**`);
    }
  }
  
  // Add disease info if viewing all diseases
  if (selectedDisease === "all" && disease_distribution.length > 0) {
    const topDisease = disease_distribution[0];
    const isDominant = disease_distribution.length > 1
      ? topDisease.count > disease_distribution[1].count * 1.4
      : true;
    
    if (isDominant) {
      parts.push(`primarily **${topDisease.label}**`);
    }
  }
  
  // Build final sentence
  let narrative = parts.join(", ");
  if (!narrative.endsWith(".")) {
    narrative += ".";
  }
  
  return narrative;
}

/**
 * Get the most common reason code from a distribution.
 */
export function getTopReasonCode(stats: AnomalyStatistics): string | null {
  return stats.reason_distribution.length > 0 
    ? stats.reason_distribution[0].label 
    : null;
}

/**
 * Get the most common disease from a distribution.
 */
export function getTopDisease(stats: AnomalyStatistics): string | null {
  return stats.disease_distribution.length > 0 
    ? stats.disease_distribution[0].label 
    : null;
}

/**
 * Get the most affected district from a distribution.
 */
export function getTopDistrict(stats: AnomalyStatistics): string | null {
  return stats.district_distribution.length > 0
    ? stats.district_distribution[0].label
    : null;
}

/**
 * Generate a plain-language clinical takeaway for the flagged cases summary.
 * Translates statistical patterns into guidance a clinician can act on.
 */
export function generateClinicalTakeaway(
  stats: AnomalyStatistics,
  selectedDisease: string
): string {
  const { total_anomalies, reason_distribution, disease_distribution, district_distribution } = stats;

  if (total_anomalies === 0) {
    return "No unusual patterns detected — current case activity appears within expected ranges.";
  }

  const topReason = reason_distribution.length > 0 ? reason_distribution[0].label : null;
  const topDisease = disease_distribution.length > 0 ? disease_distribution[0].label : null;
  const topDistrict = district_distribution.length > 0 ? district_distribution[0].label : null;

  const parts: string[] = [];

  if (topReason === "GEOGRAPHIC:RARE") {
    const diseaseRef = topDisease ? topDisease + " is" : "these diseases are";
    parts.push(`Cases are appearing in areas where ${diseaseRef} rarely reported — may indicate emerging spread`);
  } else if (topReason === "TEMPORAL:RARE") {
    const diseaseRef = topDisease ? ` for ${topDisease}` : "";
    parts.push(`Cases occurring at an unusual time of year${diseaseRef} — may signal an off-cycle outbreak`);
  } else if (topReason === "COMBINED:MULTI") {
    parts.push("Multiple factors contributing to flags — these cases warrant comprehensive review");
  } else if (topReason) {
    const label = getReasonLabel(topReason).toLowerCase();
    parts.push(`Cases mostly flagged for ${label}`);
  }

  if (selectedDisease === "all" && topDisease && disease_distribution.length > 1) {
    const pct = disease_distribution[0].percent;
    if (pct >= 50) {
      parts.push(`${topDisease} accounts for the majority of flagged cases`);
    }
  }

  if (topDistrict && district_distribution.length > 1) {
    const topPct = district_distribution[0].percent;
    if (topPct >= 50) {
      const districtText = `Cases concentrated in ${topDistrict}`;
      parts.push(districtText.charAt(0).toUpperCase() + districtText.slice(1));
    }
  }

  if (parts.length === 0) {
    if (total_anomalies <= 3) {
      return `Only ${total_anomalies} case${total_anomalies > 1 ? "s" : ""} flagged — isolated incidents, no clear pattern emerging.`;
    }
    return `${total_anomalies} cases flagged across varied patterns — continued monitoring recommended.`;
  }

  return parts.join(". ") + ".";
}
