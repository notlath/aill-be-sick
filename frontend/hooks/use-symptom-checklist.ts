"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ALL_SYMPTOMS,
  MIN_CHECKED_SYMPTOMS,
} from "@/constants/symptom-options";

export type Language = "en" | "tl";

/**
 * Manages the checked-symptom state and generates a natural-language phrase
 * suitable for the backend NLP model.
 */
export const useSymptomChecklist = (language: Language = "en") => {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // ------------------------------------------------------------------
  // Toggle / clear
  // ------------------------------------------------------------------

  const toggle = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setCheckedIds(new Set()), []);

  // ------------------------------------------------------------------
  // Phrase generation
  // ------------------------------------------------------------------

  const generatedPhrase = useMemo(() => {
    if (checkedIds.size === 0) return "";

    const phrases = ALL_SYMPTOMS
      .filter((s) => checkedIds.has(s.id))
      .map((s) => s.phrase[language]);

    // Join with periods to create distinct sentences the model can parse.
    return phrases.join(". ") + ".";
  }, [checkedIds, language]);

  // ------------------------------------------------------------------
  // Validation
  // ------------------------------------------------------------------

  const isReady = checkedIds.size >= MIN_CHECKED_SYMPTOMS;
  const remaining = Math.max(0, MIN_CHECKED_SYMPTOMS - checkedIds.size);

  return {
    checkedIds,
    toggle,
    clear,
    generatedPhrase,
    isReady,
    remaining,
    count: checkedIds.size,
  } as const;
};
