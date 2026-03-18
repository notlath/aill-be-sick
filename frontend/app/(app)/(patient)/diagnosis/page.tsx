"use client";

import { createChat } from "@/actions/create-chat";
import { CreateChatSchema, CreateChatSchemaType } from "@/schemas/CreateChatSchema";
import { useSymptomChecklist, type Language } from "@/hooks/use-symptom-checklist";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUp, ClipboardList } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import ChecklistModal from "@/components/patient/diagnosis-page/checklist-modal";

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
    execute({
      chatId: form.getValues("chatId"),
      symptoms: phrase,
    });
    setIsChecklistOpen(false);
  };

  return (
    <main className="relative flex flex-col justify-center items-center space-y-12 h-full flex-1 min-h-full bg-black overflow-hidden">
      {/* Green gradient orb from below */}
      <div
        className="absolute bottom-[-1000px] left-1/2 -translate-x-1/2 w-[100vw] h-[100vw] max-w-[1600px] max-h-[1600px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(16, 185, 129, 0.5) 0%, rgba(16, 185, 129, 0.3) 30%, rgba(16, 185, 129, 0.1) 60%, transparent 100%)",
          filter: "blur(80px)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 space-y-3 text-center px-4">
        <h1 className="font-semibold text-5xl md:text-6xl tracking-[-0.04em] text-white mb-1 leading-[1.1]">
          How are you feeling today?
        </h1>
        <p className="text-gray-400 text-lg md:text-xl font-light">
          Describe your symptoms
        </p>
      </div>

      {/* Form with inline checklist button */}
      <div className="relative z-10 w-full max-w-2xl px-4">
        <form onSubmit={form.handleSubmit(handleTextSubmit)} className="w-full">
          <div className="flex justify-between items-center shadow-xl bg-base-100/90 border border-base-300/30 rounded-2xl outline-none w-full h-auto px-4 py-3 backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
            {/* Checklist button */}
            <button
              type="button"
              onClick={() => setIsChecklistOpen(true)}
              disabled={isLoading}
              aria-label="Open symptom checklist"
              className="shrink-0 mr-3 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-base-200/80 text-base-content/60 flex items-center justify-center hover:bg-base-300 hover:text-base-content active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-base-200/80 disabled:active:scale-100"
            >
              <ClipboardList className="size-5" strokeWidth={2} />
            </button>

            <textarea
              className="flex-1 pl-1 border-none outline-none bg-transparent resize-none text-base text-base-content placeholder:text-muted transition-all duration-300 min-h-[44px] py-2.5 md:min-h-[48px] md:py-3 my-auto"
              placeholder="I'm feeling..."
              rows={1}
              suppressHydrationWarning
              disabled={isLoading}
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
              disabled={isLoading}
              aria-busy={isLoading}
              aria-live="polite"
              className="ml-3 p-0 w-12 h-12 aspect-square rounded-xl bg-primary text-primary-content shadow-md hover:shadow-xl hover:bg-primary/90 active:scale-95 transition-all duration-200 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:active:scale-100"
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <ArrowUp className="size-5" strokeWidth={2.5} />
              )}
            </button>
          </div>
          {form.formState.errors.symptoms && (
            <div
              role="alert"
              className="border border-error/30 rounded-xl alert alert-error alert-soft mt-2 text-left"
            >
              <span className="font-medium text-error">
                Error! {form.formState.errors.symptoms.message}
              </span>
            </div>
          )}
        </form>
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
      />
    </main>
  );
};

export default PatientHomePage;
