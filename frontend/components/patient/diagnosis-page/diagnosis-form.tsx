"use client";

import { CreateChatSchemaType } from "@/schemas/CreateChatSchema";
import { useSymptomChecklist, type Language } from "@/hooks/use-symptom-checklist";
import { ArrowUp, ClipboardList } from "lucide-react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import ChecklistModal from "./checklist-modal";

type DiagnosisFormProps = {
  createMessageExecute: any;
  isPending: boolean;
  disabled?: boolean;
};

const MIN_CHARACTERS = 20;

const DiagnosisForm = ({
  createMessageExecute,
  isPending,
  disabled = false,
}: DiagnosisFormProps) => {
  const form = useFormContext<CreateChatSchemaType>();
  const symptomsValue = form.watch("symptoms");
  const symptomsLength = symptomsValue?.length || 0;
  const isBelowMin = symptomsLength > 0 && symptomsLength < MIN_CHARACTERS;

  const isInteractive = !disabled && !isPending;

  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const checklist = useSymptomChecklist(language);

  // ── Free-text submit ───────────────────────────────────────────────
  const handleTextSubmit = (data: CreateChatSchemaType) => {
    createMessageExecute({
      chatId: data.chatId,
      content: data.symptoms,
      type: "SYMPTOMS",
      role: "USER",
    });
    form.setValue("symptoms", "");
  };

  // ── Checklist submit ───────────────────────────────────────────────
  const handleChecklistSubmit = (phrase: string) => {
    createMessageExecute({
      chatId: form.getValues("chatId"),
      content: phrase,
      type: "SYMPTOMS",
      role: "USER",
    });
    checklist.clear();
  };

  return (
    <>
      <div className="flex flex-col gap-3 w-full">
        {/* Text input with checklist button */}
        <div className="flex justify-center items-center w-full">
          <form
            onSubmit={form.handleSubmit(handleTextSubmit)}
            className="w-full"
          >
            <div className="space-y-2 w-full">
              <div
                className={`flex items-center gap-3 px-4 py-3 border rounded-2xl w-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  disabled || isPending
                    ? "bg-base-200/60 border-base-300/40 opacity-70"
                    : isBelowMin
                      ? "bg-base-100 border-warning/60 shadow-sm focus-within:shadow-md focus-within:border-warning"
                      : "bg-base-100 border-base-300/40 shadow-sm focus-within:shadow-md focus-within:border-primary/50"
                }`}
              >
                {/* Checklist button */}
                <button
                  type="button"
                  onClick={() => setIsChecklistOpen(true)}
                  disabled={!isInteractive}
                  aria-label="Open symptom checklist"
                  className="shrink-0 w-9 h-9 rounded-lg bg-base-200/80 text-base-content/60 flex items-center justify-center hover:bg-base-300 hover:text-base-content active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-base-200/80 disabled:active:scale-100"
                >
                  <ClipboardList className="size-4" strokeWidth={2} />
                </button>

                <textarea
                  aria-label="Describe your symptoms"
                  className="flex-1 border-none outline-none bg-transparent resize-none text-base text-base-content placeholder:text-base-content/40 transition-opacity duration-200 min-h-[44px] py-2.5 disabled:cursor-not-allowed my-auto"
                  placeholder={
                    disabled
                      ? "Please answer the question above..."
                      : "I'm feeling..."
                  }
                  rows={1}
                  suppressHydrationWarning
                  data-gramm="false"
                  data-gramm_editor="false"
                  data-enable-grammarly="false"
                  disabled={!isInteractive}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !(e.nativeEvent as any)?.isComposing
                    ) {
                      e.preventDefault();
                      void form.handleSubmit(handleTextSubmit)();
                    }
                  }}
                  {...form.register("symptoms")}
                />
                <button
                  type="submit"
                  aria-label={isPending ? "Sending\u2026" : "Send symptoms"}
                  aria-busy={isPending}
                  aria-live="polite"
                  className="shrink-0 w-11 h-11 rounded-xl bg-primary text-primary-content flex items-center justify-center shadow-sm hover:bg-primary/90 hover:shadow-md active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:active:scale-100"
                  disabled={!isInteractive || isBelowMin}
                >
                  {isPending ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <ArrowUp className="size-5" strokeWidth={2.5} />
                  )}
                </button>
              </div>

              {symptomsLength > 0 && (
                <p
                  role="status"
                  aria-live="polite"
                  className={`text-xs text-right transition-colors duration-200 ${
                    isBelowMin ? "text-warning" : "text-success"
                  }`}
                >
                  {isBelowMin
                    ? `${MIN_CHARACTERS - symptomsLength} more character${
                        MIN_CHARACTERS - symptomsLength === 1 ? "" : "s"
                      } needed`
                    : "Ready to send"}
                </p>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Checklist Modal */}
      <ChecklistModal
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
        checkedIds={checklist.checkedIds}
        onToggle={checklist.toggle}
        onClear={checklist.clear}
        generatedPhrase={checklist.generatedPhrase}
        isReady={checklist.isReady}
        remaining={checklist.remaining}
        count={checklist.count}
        language={language}
        onLanguageChange={setLanguage}
        onSubmit={handleChecklistSubmit}
        isPending={isPending}
      />
    </>
  );
};

export default DiagnosisForm;
