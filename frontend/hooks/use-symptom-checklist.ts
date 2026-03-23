"use client";

import { useCallback, useMemo, useState, useRef } from "react";
import {
  ALL_SYMPTOMS,
  MIN_CHECKED_SYMPTOMS,
} from "@/constants/symptom-options";
import {
  type TemperatureUnit,
  getAutoCheckSymptoms,
  isFeverSymptom,
} from "@/utils/fever-classification";

export type Language = "en" | "tl";

export interface TemperatureState {
  value: string;
  unit: TemperatureUnit;
  normalizedCelsius: number | null;
}

/**
 * Manages the checked-symptom state, temperature input, and generates a
 * natural-language phrase suitable for the backend NLP model.
 */
export const useSymptomChecklist = (language: Language = "en") => {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Temperature state
  const [temperature, setTemperature] = useState<TemperatureState>({
    value: "",
    unit: "celsius",
    normalizedCelsius: null,
  });

  // Track which symptoms were auto-checked by temperature
  // This allows us to distinguish user selections from auto-selections
  const autoCheckedRef = useRef<Set<string>>(new Set());

  // ------------------------------------------------------------------
  // Toggle / clear
  // ------------------------------------------------------------------

  const toggle = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // If user manually unchecks an auto-checked symptom, remove from auto-checked
        autoCheckedRef.current.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setCheckedIds(new Set());
    setTemperature({ value: "", unit: "celsius", normalizedCelsius: null });
    autoCheckedRef.current.clear();
  }, []);

  // ------------------------------------------------------------------
  // Temperature handling
  // ------------------------------------------------------------------

  const setTemperatureValue = useCallback((value: string) => {
    setTemperature((prev) => ({ ...prev, value }));
  }, []);

  const setTemperatureUnit = useCallback((unit: TemperatureUnit) => {
    setTemperature((prev) => ({ ...prev, unit }));
  }, []);

  /**
   * Called when temperature classification changes.
   * Automatically checks/unchecks fever-related symptoms based on temperature.
   */
  const handleTemperatureClassification = useCallback(
    (normalizedCelsius: number | null) => {
      setTemperature((prev) => ({ ...prev, normalizedCelsius }));

      const { symptomsToCheck, symptomsToUncheck } =
        getAutoCheckSymptoms(normalizedCelsius);

      setCheckedIds((prev) => {
        const next = new Set(prev);

        // When a temperature is provided, uncheck ALL fever symptoms that
        // no longer apply — including ones the user may have manually selected.
        // Temperature input has authority over fever-related checkboxes.
        for (const id of symptomsToUncheck) {
          next.delete(id);
          autoCheckedRef.current.delete(id);
        }

        // Check new symptoms based on temperature
        for (const id of symptomsToCheck) {
          if (!next.has(id)) {
            next.add(id);
            autoCheckedRef.current.add(id);
          }
        }

        return next;
      });
    },
    []
  );

  // ------------------------------------------------------------------
  // Phrase generation
  // ------------------------------------------------------------------

  const generatedPhrase = useMemo(() => {
    if (checkedIds.size === 0) return "";

    const phrases = ALL_SYMPTOMS.filter((s) => checkedIds.has(s.id)).map(
      (s) => s.phrase[language]
    );

    // Join with periods to create distinct sentences the model can parse.
    return phrases.join(". ") + ".";
  }, [checkedIds, language]);

  // ------------------------------------------------------------------
  // Validation
  // ------------------------------------------------------------------

  const isReady = checkedIds.size >= MIN_CHECKED_SYMPTOMS;
  const remaining = Math.max(0, MIN_CHECKED_SYMPTOMS - checkedIds.size);

  return {
    // Symptom state
    checkedIds,
    toggle,
    clear,
    generatedPhrase,
    isReady,
    remaining,
    count: checkedIds.size,

    // Temperature state
    temperature,
    setTemperatureValue,
    setTemperatureUnit,
    handleTemperatureClassification,

    // Helpers
    isFeverSymptom,
    isAutoChecked: (id: string) => autoCheckedRef.current.has(id),
  } as const;
};
