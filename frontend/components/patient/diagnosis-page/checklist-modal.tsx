"use client";

import { useEffect, useRef } from "react";
import type { Language, TemperatureState } from "@/hooks/use-symptom-checklist";
import type { TemperatureUnit } from "@/utils/fever-classification";
import { Globe, RotateCcw, X } from "lucide-react";
import SymptomChecklist from "./symptom-checklist";

type ChecklistModalProps = {
  isOpen: boolean;
  onClose: () => void;
  // Checklist props
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
  // Temperature props
  temperature?: TemperatureState;
  onTemperatureChange?: (value: string) => void;
  onTemperatureUnitChange?: (unit: TemperatureUnit) => void;
  onTemperatureClassificationChange?: (celsius: number | null) => void;
  isAutoChecked?: (id: string) => boolean;
};

const ChecklistModal = ({
  isOpen,
  onClose,
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
  temperature,
  onTemperatureChange,
  onTemperatureUnitChange,
  onTemperatureClassificationChange,
  isAutoChecked,
}: ChecklistModalProps) => {
  const modalRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle modal open/close
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    if (isOpen) {
      modal.showModal();
      // Focus the close button when modal opens
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    } else {
      modal.close();
    }
  }, [isOpen]);

  // Handle escape key and click outside
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const handleClose = () => {
      if (!isPending) {
        onClose();
      }
    };

    modal.addEventListener("close", handleClose);
    return () => modal.removeEventListener("close", handleClose);
  }, [isPending, onClose]);

  const handleSubmit = (phrase: string) => {
    onSubmit(phrase);
    onClose();
  };

  return (
    <dialog
      ref={modalRef}
      className="modal modal-bottom sm:modal-middle"
      aria-label="Symptom checklist"
    >
      <div className="modal-box max-w-2xl max-h-[85vh] flex flex-col p-0 bg-base-100">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 px-4 py-3 border-b border-base-300/50 shrink-0">
          {/* Title */}
          <h3 className="text-lg font-semibold text-base-content">
            {language === "en" ? "Select Symptoms" : "Pumili ng Sintomas"}
          </h3>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {/* Language toggle */}
            <button
              type="button"
              onClick={() => onLanguageChange(language === "en" ? "tl" : "en")}
              disabled={isPending}
              className="btn btn-ghost btn-sm gap-1.5"
            >
              <Globe className="size-3.5" strokeWidth={2} />
              <span className="hidden xs:inline">
                {language === "en" ? "Filipino" : "English"}
              </span>
            </button>

            {/* Clear all button */}
            <button
              type="button"
              onClick={onClear}
              disabled={isPending || count === 0}
              className="btn btn-ghost btn-sm gap-1.5 text-error/70 hover:text-error hover:bg-error/10 disabled:opacity-40"
            >
              <RotateCcw className="size-3.5" strokeWidth={2} />
              <span className="hidden sm:inline">Clear</span>
            </button>

            {/* Close button */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="btn btn-ghost btn-sm btn-square"
              aria-label="Close checklist"
            >
              <X className="size-4" strokeWidth={2} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden p-4 flex flex-col">
          <SymptomChecklist
            checkedIds={checkedIds}
            onToggle={onToggle}
            onClear={onClear}
            generatedPhrase={generatedPhrase}
            isReady={isReady}
            remaining={remaining}
            count={count}
            language={language}
            onLanguageChange={onLanguageChange}
            onSubmit={handleSubmit}
            isPending={isPending}
            hideLanguageToggle
            hideHeader={false}
            temperature={temperature}
            onTemperatureChange={onTemperatureChange}
            onTemperatureUnitChange={onTemperatureUnitChange}
            onTemperatureClassificationChange={onTemperatureClassificationChange}
            isAutoChecked={isAutoChecked}
          />
        </div>
      </div>

      {/* Backdrop - click to close */}
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose} disabled={isPending}>
          Close
        </button>
      </form>
    </dialog>
  );
};

export default ChecklistModal;
