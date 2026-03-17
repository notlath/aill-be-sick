"use client";

import { createChat } from "@/actions/create-chat";
import {
  CreateChatSchema,
  CreateChatSchemaType,
} from "@/schemas/CreateChatSchema";
import { useSymptomChecklist, type Language } from "@/hooks/use-symptom-checklist";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUp, ClipboardList, MessageSquareText } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "nextjs-toploader/app";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import SymptomChecklist from "./symptom-checklist";

type StartingDiagnosisFormProps = {
  onPendingSymptomsChange?: (symptoms: string) => void;
};

type InputMode = "text" | "checklist";

const StartingDiagnosisForm = ({
  onPendingSymptomsChange,
}: StartingDiagnosisFormProps) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const form = useForm<CreateChatSchemaType>({
    defaultValues: {
      symptoms: "",
      chatId: crypto.randomUUID(),
    },
    resolver: zodResolver(CreateChatSchema),
  });
  const router = useRouter();

  const [mode, setMode] = useState<InputMode>("text");
  const [language, setLanguage] = useState<Language>("en");
  const checklist = useSymptomChecklist(language);

  // Guard: only navigate on an intentional submission within this lifecycle.
  const hasSubmittedRef = useRef(false);
  const { execute, isExecuting } = useAction(createChat, {
    onSuccess: ({ data }) => {
      if (!hasSubmittedRef.current) return;
      hasSubmittedRef.current = false;
      if (data.success) {
        form.setValue("chatId", crypto.randomUUID());
        form.setValue("symptoms", "");
        checklist.clear();
        router.push(`/diagnosis/${data.success.chatId}`);
      } else if (data.error) {
        setIsNavigating(false);
        onPendingSymptomsChange?.("");
        console.error(data.error);
      }
    },
    onError: () => {
      setIsNavigating(false);
      onPendingSymptomsChange?.("");
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
    // Set symptoms into the form so createChat receives them via the schema
    form.setValue("symptoms", phrase);
    execute({
      chatId: form.getValues("chatId"),
      symptoms: phrase,
    });
  };

  return (
    <div className="flex flex-col justify-center items-center gap-4">
      {/* ── Mode toggle ──────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-1 bg-base-200/50 rounded-xl p-1">
        <button
          type="button"
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            mode === "text"
              ? "bg-base-100 text-base-content shadow-sm"
              : "text-base-content/50 hover:text-base-content/70"
          }`}
          onClick={() => setMode("text")}
          disabled={isLoading}
        >
          <MessageSquareText className="size-4" strokeWidth={2} />
          Describe
        </button>
        <button
          type="button"
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            mode === "checklist"
              ? "bg-base-100 text-base-content shadow-sm"
              : "text-base-content/50 hover:text-base-content/70"
          }`}
          onClick={() => setMode("checklist")}
          disabled={isLoading}
        >
          <ClipboardList className="size-4" strokeWidth={2} />
          Checklist
        </button>
      </div>

      {/* ── Free-text mode ───────────────────────────────────────── */}
      {mode === "text" && (
        <form
          onSubmit={form.handleSubmit(handleTextSubmit)}
          className="w-full"
        >
          <div className="space-y-12 w-full text-center">
            <div className="space-y-8">
              <div className="flex justify-between items-start shadow-xl bg-base-100/90 border border-base-300/30 rounded-2xl outline-none w-full h-auto px-4 py-3 backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
                <textarea
                  className="flex-1 pl-1 border-none outline-none bg-transparent resize-none text-base text-base-content placeholder:text-muted transition-all duration-300 min-h-[40px] md:min-h-[48px] py-1 md:py-2"
                  placeholder="I'm feeling..."
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
                  <ArrowUp className="size-5" strokeWidth={2.5} />
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
            </div>
          </div>
        </form>
      )}

      {/* ── Checklist mode ───────────────────────────────────────── */}
      {mode === "checklist" && (
        <div className="w-full bg-base-100/90 border border-base-300/30 rounded-2xl p-5 shadow-xl backdrop-blur-xl">
          <SymptomChecklist
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
        </div>
      )}
    </div>
  );
};

export default StartingDiagnosisForm;
