"use client";

import { SYMPTOM_CATEGORIES } from "@/constants/symptom-options";
import type { Language } from "@/hooks/use-symptom-checklist";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Globe,
  RotateCcw,
} from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

type SymptomChecklistProps = {
  checkedIds: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
  generatedPhrase: string;
  isReady: boolean;
  remaining: number;
  count: number;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onSubmit: (phrase: string) => void;
  isPending: boolean;
  disabled?: boolean;
  /** Hide the language toggle (when rendered in overlay with its own header) */
  hideLanguageToggle?: boolean;
  /** Hide the instruction header text */
  hideHeader?: boolean;
};

const SymptomChecklist = ({
  checkedIds,
  onToggle,
  onClear,
  generatedPhrase,
  isReady,
  remaining,
  count,
  language,
  onLanguageChange,
  onSubmit,
  isPending,
  disabled = false,
  hideLanguageToggle = false,
  hideHeader = false,
}: SymptomChecklistProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionHeaderRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const scrollAnchorRef = useRef<{ sectionId: string; top: number } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(SYMPTOM_CATEGORIES.map((c) => c.id)),
  );

  const isInteractive = !disabled && !isPending;

  const toggleSection = (sectionId: string) => {
    const container = scrollContainerRef.current;
    const header = sectionHeaderRefs.current[sectionId];

    if (container && header) {
      const containerTop = container.getBoundingClientRect().top;
      const headerTop = header.getBoundingClientRect().top;
      scrollAnchorRef.current = {
        sectionId,
        top: headerTop - containerTop,
      };
    } else {
      scrollAnchorRef.current = null;
    }
    
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
    
  };

  useLayoutEffect(() => {
    const anchor = scrollAnchorRef.current;
    if (!anchor) return;

    const container = scrollContainerRef.current;
    const header = sectionHeaderRefs.current[anchor.sectionId];
    if (!container || !header) {
      scrollAnchorRef.current = null;
      return;
    }

    const containerTop = container.getBoundingClientRect().top;
    const headerTop = header.getBoundingClientRect().top;
    const delta = headerTop - containerTop - anchor.top;
    if (delta !== 0) container.scrollTop += delta;

    scrollAnchorRef.current = null;
  }, [expandedSections]);

  const handleSubmit = () => {
    if (!isReady || !isInteractive) return;
    onSubmit(generatedPhrase);
  };

  return (
    <div className="w-full space-y-4 flex flex-col flex-1 min-h-0">
      {/* ── Language toggle ───────────────────────────────────── */}
      {!hideHeader && (
        <div className="flex items-center justify-between h-[24px] shrink-0 gap-2">
          <p className="text-sm text-base-content/60 truncate">
            {language === "en"
              ? "Check the symptoms you are experiencing"
              : "Lagyan ng tsek ang mga sintomas na nararanasan mo"}
          </p>
          {!hideLanguageToggle && (
            <button
              type="button"
              className="btn btn-ghost btn-xs gap-1.5 shrink-0"
              onClick={() => onLanguageChange(language === "en" ? "tl" : "en")}
              disabled={!isInteractive}
            >
              <Globe className="size-3.5" strokeWidth={2} />
              {language === "en" ? "Filipino" : "English"}
            </button>
          )}
        </div>
      )}

      {/* ── Symptom categories ────────────────────────────────── */}
      <div ref={scrollContainerRef} className="space-y-2 flex-1 min-h-0 shrink-0 overflow-y-auto pr-1 overscroll-contain will-change-scroll">
        {SYMPTOM_CATEGORIES.map((category) => {
          const isExpanded = expandedSections.has(category.id);
          const checkedInCategory = category.symptoms.filter((s) =>
            checkedIds.has(s.id),
          ).length;

          return (
            <div
              key={category.id}
              className="border border-base-300/50 rounded-xl overflow-hidden transition-colors duration-200"
            >
              {/* Section header */}
                <button
                  type="button"
                  ref={(el) => {
                    sectionHeaderRefs.current[category.id] = el;
                  }}
                  className="flex items-center justify-between w-full min-h-[44px] px-3.5 py-2.5 text-left hover:bg-base-200/50 transition-colors duration-200"
                  onClick={() => toggleSection(category.id)}
                  disabled={!isInteractive}
                >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-medium text-base-content">
                    {category.title[language]}
                  </span>
                  {/* Always render badge to prevent layout shift; use opacity to hide/show */}
                  <span
                    className={`badge badge-primary badge-xs transition-opacity duration-150 ${
                      checkedInCategory > 0 ? "opacity-100" : "opacity-0"
                    }`}
                    aria-hidden={checkedInCategory === 0}
                  >
                    {checkedInCategory || 0}
                  </span>
                </div>
                <ChevronDown
                  className={`size-4 text-base-content/50 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  strokeWidth={2}
                />
              </button>

              {/* Symptom checkboxes */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-1">
                  {category.description && (
                    <p className="text-xs text-base-content/40 mb-2 pl-1">
                      {category.description[language]}
                    </p>
                  )}
                  {category.symptoms.map((symptom) => {
                    const isChecked = checkedIds.has(symptom.id);
                    return (
                      <label
                        key={symptom.id}
                        className={`relative flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer select-none border ${
                          isChecked
                            ? "bg-primary/10 border-primary/20"
                            : "hover:bg-base-200/50 border-transparent"
                        } ${!isInteractive ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <div
                          className={`flex items-center justify-center size-5 rounded-md border-2 shrink-0 ${
                            isChecked
                              ? "bg-primary border-primary"
                              : "border-base-300 bg-base-100"
                          }`}
                        >
                          <Check
                            className={`size-3 text-primary-content ${isChecked ? "opacity-100" : "opacity-0"}`}
                            strokeWidth={3}
                          />
                        </div>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isChecked}
                          disabled={!isInteractive}
                          onChange={() => onToggle(symptom.id)}
                        />
                        <span className="text-sm text-base-content leading-snug">
                          {symptom.label[language]}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Generated phrase preview */}
      {count > 0 && (
        <div className="flex flex-col gap-2 h-[88px] shrink-0 animate-in fade-in duration-300">
          <div className="flex items-center justify-between h-[20px] shrink-0 gap-2">
            <p className="text-xs font-medium text-base-content/60 truncate">
              {language === "en" ? "Generated description" : "Nabuong paglalarawan"}
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-xs gap-1 shrink-0"
              onClick={onClear}
              disabled={!isInteractive}
            >
              <RotateCcw className="size-3" strokeWidth={2.5} />
              {language === "en" ? "Clear all" : "Burahin lahat"}
            </button>
          </div>
          <div className="bg-base-200/50 border border-base-300/40 rounded-xl px-3.5 py-2.5 text-sm text-base-content/80 leading-relaxed h-[60px] overflow-y-auto">
            {generatedPhrase || "\u00A0"}
          </div>
        </div>
      )}

      {/* ── Submit bar ────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 h-[40px] shrink-0">
        <p
          role="status"
          aria-live="polite"
          className={`text-xs truncate transition-colors duration-200 ${
            isReady ? "text-success" : "text-base-content/50"
          }`}
        >
          {count === 0
            ? language === "en"
              ? "Select at least 2 symptoms"
              : "Pumili ng hindi bababa sa 2 sintomas"
            : isReady
              ? language === "en"
                ? `${count} symptom${count > 1 ? "s" : ""} selected — ready to send`
                : `${count} sintomas na napili — handa nang ipadala`
              : language === "en"
                ? `${remaining} more needed`
                : `${remaining} pa ang kailangan`}
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isReady || !isInteractive}
          className="btn btn-primary btn-sm gap-1.5 shadow-sm shrink-0"
        >
          {isPending ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <>
              <ArrowUp className="size-4" strokeWidth={2.5} />
              {language === "en" ? "Send" : "Ipadala"}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SymptomChecklist;
