"use client";

import { createChat } from "@/actions/create-chat";
import { CreateChatSchema, CreateChatSchemaType } from "@/schemas/CreateChatSchema";
import { useSymptomChecklist, type Language } from "@/hooks/use-symptom-checklist";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUp, ClipboardList, Sparkles, Info } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import ChecklistModal from "@/components/patient/diagnosis-page/checklist-modal";
import LegalFooter from "@/components/shared/legal-footer";

const PatientHomePage = () => {
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const checklist = useSymptomChecklist(language);

  const form = useForm<CreateChatSchemaType>({
    defaultValues: {
      symptoms: "",
      chatId: crypto.randomUUID(),
    },
    resolver: zodResolver(CreateChatSchema),
  });
  const router = useRouter();

  // Guard: only navigate on an intentional submission within this lifecycle.
  const hasSubmittedRef = useRef(false);
  const isMountedRef = useRef(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    // If this page is restored from router cache, clear stale loading UI.
    setIsNavigating(false);
    hasSubmittedRef.current = false;

    return () => {
      isMountedRef.current = false;
      hasSubmittedRef.current = false;
    };
  }, []);

  const { execute, isExecuting } = useAction(createChat, {
    onSuccess: ({ data }) => {
      if (!isMountedRef.current) return;
      if (!hasSubmittedRef.current) return;
      hasSubmittedRef.current = false;
      if (data?.success) {
        form.setValue("chatId", crypto.randomUUID());
        form.setValue("symptoms", "");
        checklist.clear();
        setIsNavigating(true);
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = "44px";
        }
        router.push(`/diagnosis/${data.success.chatId}`);
      } else if (data?.error) {
        setIsNavigating(false);
        console.error(data.error);
      }
    },
    onError: () => {
      if (!isMountedRef.current) return;
      setIsNavigating(false);
    },
  });

  const isLoading = isExecuting || isNavigating;

  // ── Free-text submit ───────────────────────────────────────────────
  const handleTextSubmit = (data: CreateChatSchemaType) => {
    hasSubmittedRef.current = true;
    execute(data);
  };

  // ── Checklist submit ───────────────────────────────────────────────
  const handleChecklistSubmit = (phrase: string) => {
    hasSubmittedRef.current = true;
    form.setValue("symptoms", phrase);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = "44px";
    }
    execute({
      chatId: form.getValues("chatId"),
      symptoms: phrase,
    });
    setIsChecklistOpen(false);
  };

  return (
    <main className="relative flex flex-col flex-1 bg-base-200 overflow-hidden">
      {/* Decorative gradient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Primary gradient orb */}
        <div
          className="absolute -bottom-1/4 left-1/2 -translate-x-1/2 w-[150%] aspect-square max-w-[1200px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, oklch(69% 0.17 162.48 / 0.4) 0%, oklch(69% 0.17 162.48 / 0.2) 30%, oklch(69% 0.17 162.48 / 0.05) 60%, transparent 80%)",
            filter: "blur(60px)",
          }}
        />
        {/* Secondary accent orb */}
        <div
          className="absolute -top-1/4 -right-1/4 w-[60%] aspect-square rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, oklch(71% 0.203 305.504 / 0.3) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* Main content area */}
      <div className="relative z-10 flex flex-col flex-1 justify-center items-center px-4 py-12 sm:py-16">
        {/* Hero section */}
        <div className="text-center mb-8 sm:mb-10 max-w-2xl animate-fade-in">
          {/* AI Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
            <Sparkles className="size-3.5" />
            AI-Powered Symptom Analysis
          </div>
          
          <h1 className="font-semibold text-3xl sm:text-4xl md:text-5xl tracking-tight text-base-content mb-3 leading-tight">
            How are you <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary italic pr-1">feeling</span> today?
          </h1>
          <p className="text-base-content/60 text-base sm:text-lg mb-5">
            Describe your symptoms and get helpful insights
          </p>
          <button
            type="button"
            onClick={() => (document.querySelector(".help-guide-dialog") as HTMLDialogElement)?.showModal()}
            className="btn btn-ghost btn-sm rounded-full gap-2 font-medium text-base-content/60 hover:text-base-content hover:bg-base-200/60 transition-colors duration-200"
          >
            <Info className="size-4" />
            How to use this app
          </button>
        </div>

        {/* Input Form */}
        <div className="w-full max-w-2xl animate-slide-up" style={{ animationDelay: "100ms" }}>
          <form onSubmit={form.handleSubmit(handleTextSubmit)} className="w-full">
            <div className="card bg-base-100 shadow-lg border border-border overflow-hidden">
              <div className="card-body p-0">
                <div className="flex items-center gap-2 px-3 py-3 sm:px-4 sm:py-4">
                  {/* Checklist button */}
                  <button
                    type="button"
                    onClick={() => setIsChecklistOpen(true)}
                    disabled={isLoading}
                    aria-label="Open symptom checklist"
                    className="btn btn-square btn-ghost shrink-0 h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-base-200/80 hover:bg-base-300 text-base-content/60 hover:text-base-content transition-[color,background-color] duration-200 disabled:opacity-50"
                  >
                    <ClipboardList className="size-5" strokeWidth={2} />
                  </button>

                  {/* Textarea */}
                  <div className="flex-1 min-w-0 flex items-center">
                    <textarea
                      ref={textareaRef}
                      className="w-full px-4 py-2.5 sm:py-3 border-none outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none bg-base-200/50 rounded-xl resize-none overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] text-base text-base-content placeholder:text-base-content/40 transition-colors duration-200 focus:bg-base-200/80 min-h-[44px] max-h-[200px]"
                      placeholder="I'm feeling..."
                      aria-label="Describe your symptoms"
                      autoComplete="off"
                      rows={1}
                      suppressHydrationWarning
                      disabled={isLoading}
                      onChange={(e) => {
                        form.setValue("symptoms", e.target.value);
                        adjustTextareaHeight();
                      }}
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
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    aria-busy={isLoading}
                    aria-live="polite"
                    aria-label="Submit symptoms"
                    className="btn btn-primary btn-square shrink-0 h-11 w-11 sm:h-12 sm:w-12 rounded-xl shadow-md hover:shadow-lg transition-[transform,background-color,box-shadow,opacity] duration-200 disabled:opacity-60"
                  >
                    {isLoading ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      <ArrowUp className="size-5" strokeWidth={2.5} />
                    )}
                  </button>
                </div>

                {/* Input hint */}
                <div className="px-3 pb-3 pt-0 sm:px-4 sm:pb-4 flex items-center justify-between text-xs text-base-content/40">
                  <span>Press Enter to submit, Shift + Enter for new line</span>
                </div>
              </div>
            </div>

            {/* Error message */}
            {form.formState.errors.symptoms && (
              <div role="alert" className="alert alert-error alert-soft mt-3">
                <span className="font-medium">
                  {form.formState.errors.symptoms.message}
                </span>
              </div>
            )}
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
        isPending={isLoading}
        temperature={checklist.temperature}
        onTemperatureChange={checklist.setTemperatureValue}
        onTemperatureUnitChange={checklist.setTemperatureUnit}
        onTemperatureClassificationChange={checklist.handleTemperatureClassification}
        isAutoChecked={checklist.isAutoChecked}
      />

      {/* Footer */}
      <LegalFooter />
    </main>
  );
};

export default PatientHomePage;
