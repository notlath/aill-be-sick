"use client";

import { CreateChatSchemaType } from "@/schemas/CreateChatSchema";
import { ArrowUp } from "lucide-react";
import { useFormContext } from "react-hook-form";

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
              } ${isBelowMin ? "border-warning" : ""}`}
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
                disabled={disabled || isPending || isBelowMin}
              >
                <ArrowUp className="size-4" />
              </button>
            </div>
            {symptomsLength > 0 && (
              <div className="text-xs text-right">
                <span
                  className={
                    isBelowMin ? "text-warning" : "text-success"
                  }
                >
                  {symptomsLength}/{MIN_CHARACTERS} characters
                </span>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default DiagnosisForm;
