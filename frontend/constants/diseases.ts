/**
 * Centralized Disease Constants with Endemic Status
 *
 * Endemic diseases in the Philippines context:
 * - Dengue: Highly endemic, especially in NCR, Region IV-A (CALABARZON), Region III (Central Luzon)
 * - Typhoid: Endemic in areas with poor sanitation, common in urban slums
 * - Diarrhea: Endemic, especially during rainy season and in areas with limited clean water
 * - Measles: Periodic outbreaks, higher risk in unvaccinated communities
 * - Influenza: Seasonal endemic, peaks during rainy season (June-November)
 *
 * Non-endemic but common:
 * - Pneumonia: Common but not considered endemic, can occur year-round
 * - Impetigo: Common bacterial skin infection, not endemic
 *
 * Data sources:
 * - DOH Philippines Disease Surveillance Reports
 * - WHO Western Pacific Region Health Information
 */

export type DiseaseValue =
  | "DENGUE"
  | "PNEUMONIA"
  | "TYPHOID"
  | "DIARRHEA"
  | "MEASLES"
  | "INFLUENZA";

export type DiseaseDisplayName =
  | "Dengue"
  | "Pneumonia"
  | "Typhoid"
  | "Diarrhea"
  | "Measles"
  | "Influenza";

export interface DiseaseMetadata {
  /** Display name for UI */
  name: DiseaseDisplayName;
  /** Uppercase value for enums and database */
  value: DiseaseValue;
  /** Whether the disease is endemic in the Philippines */
  endemic: boolean;
  /** Peak seasons for endemic diseases (month numbers, 1-12) */
  peakMonths?: number[];
  /** Brief description of endemic status */
  endemicDescription?: string;
  /** Regions where particularly prevalent (optional) */
  endemicRegions?: string[];
  /** Severity level for triage context */
  severityLevel: "low" | "moderate" | "high" | "critical";
  /** Icon color theme for visual consistency */
  colorTheme: {
    bg: string;
    text: string;
    border: string;
    badge: string;
  };
}

/**
 * Comprehensive disease metadata with endemic status
 */
export const DISEASES: DiseaseMetadata[] = [
  {
    name: "Dengue",
    value: "DENGUE",
    endemic: true,
    peakMonths: [6, 7, 8, 9, 10, 11], // June to November (rainy season)
    endemicDescription:
      "Highly endemic in the Philippines, especially during rainy season",
    endemicRegions: [
      "NCR",
      "Region IV-A (CALABARZON)",
      "Region III (Central Luzon)",
      "Region VII (Central Visayas)",
    ],
    severityLevel: "critical",
    colorTheme: {
      bg: "bg-red-500/10",
      text: "text-red-600",
      border: "border-red-200",
      badge: "bg-red-100 text-red-700 border-red-200",
    },
  },
  {
    name: "Pneumonia",
    value: "PNEUMONIA",
    endemic: false,
    endemicDescription: "Common respiratory infection, not considered endemic",
    severityLevel: "high",
    colorTheme: {
      bg: "bg-blue-500/10",
      text: "text-blue-600",
      border: "border-blue-200",
      badge: "bg-blue-100 text-blue-700 border-blue-200",
    },
  },
  {
    name: "Typhoid",
    value: "TYPHOID",
    endemic: true,
    peakMonths: [3, 4, 5, 6, 7], // March to July (transition and early rainy)
    endemicDescription:
      "Endemic in areas with poor sanitation, common in urban communities",
    endemicRegions: ["NCR", "Region IV-A (CALABARZON)"],
    severityLevel: "high",
    colorTheme: {
      bg: "bg-amber-500/10",
      text: "text-amber-600",
      border: "border-amber-200",
      badge: "bg-amber-100 text-amber-700 border-amber-200",
    },
  },
  {
    name: "Diarrhea",
    value: "DIARRHEA",
    endemic: true,
    peakMonths: [6, 7, 8, 9, 10], // Rainy season
    endemicDescription:
      "Endemic, especially during rainy season and in areas with limited clean water access",
    severityLevel: "moderate",
    colorTheme: {
      bg: "bg-teal-500/10",
      text: "text-teal-600",
      border: "border-teal-200",
      badge: "bg-teal-100 text-teal-700 border-teal-200",
    },
  },
  {
    name: "Measles",
    value: "MEASLES",
    endemic: true,
    peakMonths: [1, 2, 3, 4, 5], // January to May (dry season outbreaks)
    endemicDescription:
      "Periodic outbreaks, higher risk in unvaccinated communities",
    severityLevel: "high",
    colorTheme: {
      bg: "bg-purple-500/10",
      text: "text-purple-600",
      border: "border-purple-200",
      badge: "bg-purple-100 text-purple-700 border-purple-200",
    },
  },
  {
    name: "Influenza",
    value: "INFLUENZA",
    endemic: true,
    peakMonths: [6, 7, 8, 9, 10, 11], // Rainy season
    endemicDescription: "Seasonal endemic, peaks during rainy season",
    severityLevel: "moderate",
    colorTheme: {
      bg: "bg-indigo-500/10",
      text: "text-indigo-600",
      border: "border-indigo-200",
      badge: "bg-indigo-100 text-indigo-700 border-indigo-200",
    },
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get disease metadata by name (case-insensitive)
 */
export function getDiseaseByName(name: string): DiseaseMetadata | undefined {
  return DISEASES.find((d) => d.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get disease metadata by value (uppercase enum)
 */
export function getDiseaseByValue(value: string): DiseaseMetadata | undefined {
  return DISEASES.find((d) => d.value === value.toUpperCase());
}

/**
 * Check if a disease is endemic
 */
export function isEndemic(diseaseNameOrValue: string): boolean {
  const disease =
    getDiseaseByName(diseaseNameOrValue) ||
    getDiseaseByValue(diseaseNameOrValue);
  return disease?.endemic ?? false;
}

/**
 * Get all endemic diseases
 */
export function getEndemicDiseases(): DiseaseMetadata[] {
  return DISEASES.filter((d) => d.endemic);
}

/**
 * Get all non-endemic diseases
 */
export function getNonEndemicDiseases(): DiseaseMetadata[] {
  return DISEASES.filter((d) => !d.endemic);
}

/**
 * Check if current month is within a disease's peak season
 */
export function isInPeakSeason(disease: DiseaseMetadata): boolean {
  if (!disease.peakMonths || disease.peakMonths.length === 0) return false;
  const currentMonth = new Date().getMonth() + 1; // getMonth() is 0-indexed
  return disease.peakMonths.includes(currentMonth);
}

/**
 * Get diseases currently in peak season
 */
export function getDiseasesInPeakSeason(): DiseaseMetadata[] {
  return DISEASES.filter((d) => d.endemic && isInPeakSeason(d));
}

/**
 * Get month name for display
 */
export function getMonthName(month: number): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month - 1] || "";
}

/**
 * Format peak months as a readable string
 */
export function formatPeakMonths(disease: DiseaseMetadata): string {
  if (!disease.peakMonths || disease.peakMonths.length === 0) return "";

  const months = disease.peakMonths.map(getMonthName);
  if (months.length === 1) return months[0];
  if (months.length === 2) return `${months[0]} and ${months[1]}`;

  // Check if months are consecutive to show as a range
  const isConsecutive = disease.peakMonths.every(
    (m, i, arr) => i === 0 || m === arr[i - 1] + 1
  );

  if (isConsecutive) {
    return `${months[0]} to ${months[months.length - 1]}`;
  }

  return months.join(", ");
}

// =============================================================================
// Derived Constants for Compatibility
// =============================================================================

/** Array of disease display names (for dropdowns, etc.) */
export const DISEASE_NAMES = DISEASES.map((d) => d.name);

/** Array of disease values (for enums, database) */
export const DISEASE_VALUES = DISEASES.map((d) => d.value);

/** Disease options for select components (with "all" option) */
export const DISEASE_SELECT_OPTIONS = [
  { value: "all", label: "All Diseases" },
  ...DISEASES.map((d) => ({ value: d.value, label: d.name })),
];
