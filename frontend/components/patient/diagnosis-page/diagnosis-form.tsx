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
    <div className="flex justify-center items-center w-full">
      <form onSubmit={form.handleSubmit(handleSubmit)} className="w-full">
        <div className="space-y-4 w-full md:w-[800px] mx-auto text-center">
          <div className="space-y-4">
            <div
              className={`flex justify-between items-start py-3 border rounded-xl outline-none w-full h-auto input ${
                disabled ? "bg-base-200 opacity-70 cursor-not-allowed" : ""
              }`}
            >
              <textarea
                className="flex-1 pl-1 border-none outline-none disabled:bg-transparent"
                placeholder={
                  disabled
                    ? "Please answer the question above..."
                    : "I'm feeling..."
                }
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
                className="w-auto min-w-10 h-10 px-3 aspect-square btn btn-primary"
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
