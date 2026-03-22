/**
 * Fever Classification Utility
 *
 * Provides temperature-to-fever classification logic, unit conversion,
 * and auto-mapping to symptom checkboxes for the diagnosis form.
 *
 * Medical reference ranges (oral temperature):
 * - Normal: < 37.0°C (< 98.6°F)
 * - Low-grade fever: 37.0 - 37.9°C (98.6 - 100.2°F)
 * - Moderate fever: 38.0 - 38.9°C (100.4 - 102.0°F)
 * - High fever: 39.0 - 39.9°C (102.2 - 103.8°F)
 * - Hyperpyrexia: ≥ 40.0°C (≥ 104.0°F)
 */

// =============================================================================
// Types & Constants
// =============================================================================

export type TemperatureUnit = "celsius" | "fahrenheit";

export enum FeverLevel {
  NORMAL = "NORMAL",
  LOW_GRADE = "LOW_GRADE",
  MODERATE = "MODERATE",
  HIGH = "HIGH",
  HYPERPYREXIA = "HYPERPYREXIA",
}

/** Valid temperature bounds in Celsius */
export const TEMP_BOUNDS = {
  MIN_CELSIUS: 30,
  MAX_CELSIUS: 45,
  MIN_FAHRENHEIT: 86,
  MAX_FAHRENHEIT: 113,
} as const;

/** Temperature thresholds in Celsius */
const THRESHOLDS = {
  LOW_GRADE: 37.0,
  MODERATE: 38.0,
  HIGH: 39.0,
  HYPERPYREXIA: 40.0,
} as const;

/** Symptom checkbox IDs that correspond to fever levels */
export const FEVER_SYMPTOM_IDS = {
  MILD_FEVER: "mild_fever",
  HIGH_FEVER: "high_fever",
  CHILLS_SHIVERING: "chills_shivering",
} as const;

// =============================================================================
// Unit Conversion
// =============================================================================

/**
 * Converts Celsius to Fahrenheit
 */
export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

/**
 * Converts Fahrenheit to Celsius
 */
export function fahrenheitToCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

/**
 * Converts temperature to Celsius regardless of input unit
 */
export function toCelsius(value: number, unit: TemperatureUnit): number {
  return unit === "fahrenheit" ? fahrenheitToCelsius(value) : value;
}

/**
 * Formats temperature with unit symbol
 */
export function formatTemperature(
  value: number,
  unit: TemperatureUnit,
  decimals: number = 1
): string {
  const symbol = unit === "celsius" ? "°C" : "°F";
  return `${value.toFixed(decimals)}${symbol}`;
}

// =============================================================================
// Validation
// =============================================================================

export interface TemperatureValidationResult {
  isValid: boolean;
  normalizedCelsius: number | null;
  error?: string;
  errorTagalog?: string;
}

/**
 * Validates and normalizes temperature input
 *
 * @param value - Raw temperature value
 * @param unit - Temperature unit
 * @returns Validation result with normalized Celsius value
 */
export function validateTemperature(
  value: number | string | null | undefined,
  unit: TemperatureUnit
): TemperatureValidationResult {
  // Handle empty/null input - this is valid since temperature is optional
  if (value === null || value === undefined || value === "") {
    return { isValid: true, normalizedCelsius: null };
  }

  // Parse string to number if needed
  const numValue = typeof value === "string" ? parseFloat(value) : value;

  // Check if it's a valid number
  if (isNaN(numValue)) {
    return {
      isValid: false,
      normalizedCelsius: null,
      error: "Please enter a valid number",
      errorTagalog: "Maglagay ng tamang numero",
    };
  }

  // Convert to Celsius for validation
  const celsius = toCelsius(numValue, unit);

  // Check bounds
  if (celsius < TEMP_BOUNDS.MIN_CELSIUS) {
    return {
      isValid: false,
      normalizedCelsius: null,
      error: `Temperature too low (minimum ${TEMP_BOUNDS.MIN_CELSIUS}°C / ${TEMP_BOUNDS.MIN_FAHRENHEIT}°F)`,
      errorTagalog: `Masyadong mababa ang temperatura (minimum ${TEMP_BOUNDS.MIN_CELSIUS}°C / ${TEMP_BOUNDS.MIN_FAHRENHEIT}°F)`,
    };
  }

  if (celsius > TEMP_BOUNDS.MAX_CELSIUS) {
    return {
      isValid: false,
      normalizedCelsius: null,
      error: `Temperature too high (maximum ${TEMP_BOUNDS.MAX_CELSIUS}°C / ${TEMP_BOUNDS.MAX_FAHRENHEIT}°F)`,
      errorTagalog: `Masyadong mataas ang temperatura (maximum ${TEMP_BOUNDS.MAX_CELSIUS}°C / ${TEMP_BOUNDS.MAX_FAHRENHEIT}°F)`,
    };
  }

  return {
    isValid: true,
    normalizedCelsius: Math.round(celsius * 10) / 10, // Round to 1 decimal
  };
}

// =============================================================================
// Fever Classification
// =============================================================================

/**
 * Classifies a temperature reading into a fever level
 *
 * @param tempCelsius - Temperature in Celsius
 * @returns FeverLevel classification
 */
export function classifyFever(tempCelsius: number): FeverLevel {
  if (tempCelsius >= THRESHOLDS.HYPERPYREXIA) {
    return FeverLevel.HYPERPYREXIA;
  }
  if (tempCelsius >= THRESHOLDS.HIGH) {
    return FeverLevel.HIGH;
  }
  if (tempCelsius >= THRESHOLDS.MODERATE) {
    return FeverLevel.MODERATE;
  }
  if (tempCelsius >= THRESHOLDS.LOW_GRADE) {
    return FeverLevel.LOW_GRADE;
  }
  return FeverLevel.NORMAL;
}

/**
 * Gets bilingual labels for fever levels
 */
export function getFeverLabel(
  level: FeverLevel,
  language: "en" | "tl" = "en"
): string {
  const labels: Record<FeverLevel, { en: string; tl: string }> = {
    [FeverLevel.NORMAL]: {
      en: "Normal",
      tl: "Normal",
    },
    [FeverLevel.LOW_GRADE]: {
      en: "Low-grade fever",
      tl: "Mababang lagnat",
    },
    [FeverLevel.MODERATE]: {
      en: "Moderate fever",
      tl: "Katamtamang lagnat",
    },
    [FeverLevel.HIGH]: {
      en: "High fever",
      tl: "Mataas na lagnat",
    },
    [FeverLevel.HYPERPYREXIA]: {
      en: "Very high fever",
      tl: "Napakataas na lagnat",
    },
  };

  return labels[level][language];
}

/**
 * Gets the DaisyUI badge color class for a fever level
 */
export function getFeverBadgeColor(level: FeverLevel): string {
  switch (level) {
    case FeverLevel.NORMAL:
      return "badge-success";
    case FeverLevel.LOW_GRADE:
      return "badge-warning";
    case FeverLevel.MODERATE:
      return "badge-warning";
    case FeverLevel.HIGH:
      return "badge-error";
    case FeverLevel.HYPERPYREXIA:
      return "badge-error";
    default:
      return "badge-ghost";
  }
}

// =============================================================================
// Auto-Check Symptom Mapping
// =============================================================================

export interface AutoCheckResult {
  symptomsToCheck: string[];
  symptomsToUncheck: string[];
}

/**
 * Determines which fever-related symptom checkboxes should be auto-selected
 * based on the temperature reading.
 *
 * Mapping logic:
 * - < 37.0°C: No fever checkboxes
 * - 37.0 - 37.9°C: mild_fever
 * - 38.0 - 39.9°C: high_fever
 * - ≥ 40.0°C: high_fever + chills_shivering
 *
 * @param tempCelsius - Temperature in Celsius (or null if not provided)
 * @returns Object with symptom IDs to check and uncheck
 */
export function getAutoCheckSymptoms(
  tempCelsius: number | null
): AutoCheckResult {
  const allFeverSymptoms = [
    FEVER_SYMPTOM_IDS.MILD_FEVER,
    FEVER_SYMPTOM_IDS.HIGH_FEVER,
    FEVER_SYMPTOM_IDS.CHILLS_SHIVERING,
  ];

  // If no temperature provided, don't auto-check anything
  if (tempCelsius === null) {
    return {
      symptomsToCheck: [],
      symptomsToUncheck: [], // Don't uncheck - user may have manually selected
    };
  }

  const level = classifyFever(tempCelsius);

  switch (level) {
    case FeverLevel.NORMAL:
      return {
        symptomsToCheck: [],
        symptomsToUncheck: allFeverSymptoms,
      };

    case FeverLevel.LOW_GRADE:
      return {
        symptomsToCheck: [FEVER_SYMPTOM_IDS.MILD_FEVER],
        symptomsToUncheck: [
          FEVER_SYMPTOM_IDS.HIGH_FEVER,
          FEVER_SYMPTOM_IDS.CHILLS_SHIVERING,
        ],
      };

    case FeverLevel.MODERATE:
    case FeverLevel.HIGH:
      return {
        symptomsToCheck: [FEVER_SYMPTOM_IDS.HIGH_FEVER],
        symptomsToUncheck: [
          FEVER_SYMPTOM_IDS.MILD_FEVER,
          FEVER_SYMPTOM_IDS.CHILLS_SHIVERING,
        ],
      };

    case FeverLevel.HYPERPYREXIA:
      return {
        symptomsToCheck: [
          FEVER_SYMPTOM_IDS.HIGH_FEVER,
          FEVER_SYMPTOM_IDS.CHILLS_SHIVERING,
        ],
        symptomsToUncheck: [FEVER_SYMPTOM_IDS.MILD_FEVER],
      };

    default:
      return {
        symptomsToCheck: [],
        symptomsToUncheck: [],
      };
  }
}

/**
 * Checks if a symptom ID is a fever-related symptom
 */
export function isFeverSymptom(symptomId: string): boolean {
  return Object.values(FEVER_SYMPTOM_IDS).includes(
    symptomId as (typeof FEVER_SYMPTOM_IDS)[keyof typeof FEVER_SYMPTOM_IDS]
  );
}
