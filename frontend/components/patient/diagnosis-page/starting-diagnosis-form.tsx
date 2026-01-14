"use client";

import { createChat } from "@/actions/create-chat";
import {
  CreateChatSchema,
  CreateChatSchemaType,
} from "@/schemas/CreateChatSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUp, Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "nextjs-toploader/app";
import { useForm } from "react-hook-form";

const StartingDiagnosisForm = () => {
  const form = useForm<CreateChatSchemaType>({
    defaultValues: {
      symptoms: "",
      chatId: crypto.randomUUID(),
    },
    resolver: zodResolver(CreateChatSchema),
  });
  const router = useRouter();
  const { execute, isExecuting } = useAction(createChat, {
    onSuccess: ({ data }) => {
      if (data.success) {
        router.push(`/diagnosis/${data.success.chatId}`);
      } else if (data.error) {
        // TODO: Error handling
        console.error(data.error);
      }
    },
  });

  const handleSubmit = (data: CreateChatSchemaType) => {
    execute(data);
  };

  return (
    <div className="flex justify-center items-center">
      <form onSubmit={form.handleSubmit(handleSubmit)} className="w-full">
        <div className="space-y-12 w-full text-center">
          <div className="space-y-8">
            <div className="flex justify-between items-start shadow-xl bg-base-100/90 border border-base-300/30 rounded-2xl outline-none w-full h-auto px-4 py-3 backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
              <textarea
                className="flex-1 pl-1 border-none outline-none bg-transparent resize-none   text-base-content placeholder:text-muted transition-all duration-300 min-h-[40px]"
                placeholder="I'm feeling..."
                suppressHydrationWarning
                onKeyDown={(e) => {
                  // Submit on Enter, allow Shift+Enter for newline, and ignore IME composition
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !(e.nativeEvent as any)?.isComposing
                  ) {
                    e.preventDefault();
                    // Trigger form submit programmatically
                    void form.handleSubmit(handleSubmit)();
                  }
                }}
                {...form.register("symptoms")}
              />
              <button
                type="submit"
                disabled={isExecuting}
                className="ml-3 p-0 w-12 h-12 aspect-square rounded-xl bg-primary text-primary-content shadow-md hover:shadow-xl hover:bg-primary/90 active:scale-95 transition-all duration-200 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:active:scale-100"
              >
                {isExecuting ? (
                  <Loader2 className="size-5 animate-spin" strokeWidth={2.5} />
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
          </div>
        </div>
      </form>
    </div>
  );
};

export default StartingDiagnosisForm;
