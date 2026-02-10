"use client";

import { CreateChatSchemaType } from "@/schemas/CreateChatSchema";
import { ArrowUp } from "lucide-react";
import { useFormContext } from "react-hook-form";

type DiagnosisFormProps = {
  createMessageExecute: any;
  isPending: boolean;
  disabled?: boolean;
};

const DiagnosisForm = ({
  createMessageExecute,
  isPending,
  disabled = false,
}: DiagnosisFormProps) => {
  const form = useFormContext<CreateChatSchemaType>();

  const handleSubmit = (data: CreateChatSchemaType) => {
    createMessageExecute({
      chatId: data.chatId,
      content: data.symptoms,
      type: "SYMPTOMS",
      role: "USER",
    });
    form.setValue("symptoms", "");
  };

  return (
    <div className="flex justify-center items-center">
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-16 w-[800px] text-center">
          <div className="space-y-4">
            <div className={`flex justify-between items-start shadow-2xl/10 py-3 border rounded-xl outline-none w-full h-auto input ${disabled ? 'bg-gray-100 opacity-50 cursor-not-allowed' : ''}`}>
              <textarea
                className="flex-1 pl-1 border-none outline-none disabled:bg-transparent"
                placeholder={disabled ? "Please answer the question above..." : "I'm feeling..."}
                suppressHydrationWarning
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
                disabled={disabled || isPending}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !(e.nativeEvent as any)?.isComposing
                  ) {
                    e.preventDefault();
                    void form.handleSubmit(handleSubmit)();
                  }
                }}
                {...form.register("symptoms")}
              />
              <button
                type="submit"
                className="p-0 w-10 h-10 aspect-square btn btn-primary"
                disabled={disabled || isPending}
              >
                <ArrowUp className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default DiagnosisForm;
