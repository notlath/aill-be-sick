"use client";

import { CreateDiagnosisSchemaType } from "@/schemas/CreateDiagnosisSchema";
import { ArrowUp } from "lucide-react";
import { useFormContext } from "react-hook-form";

type DiagnosisFormProps = {
  createMessageExecute: any;
};

const DiagnosisForm = ({ createMessageExecute }: DiagnosisFormProps) => {
  const form = useFormContext<CreateDiagnosisSchemaType>();

  const handleSubmit = (data: CreateDiagnosisSchemaType) => {
    createMessageExecute({
      chatId: data.chatId,
      content: data.symptoms,
      type: "SYMPTOMS",
      role: "USER",
    });
  };

  return (
    <div className="flex justify-center items-center">
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-16 w-[800px] text-center">
          <div className="space-y-4">
            <div className="flex justify-between items-start shadow-2xl/10 py-3 border rounded-xl outline-none w-full h-auto input">
              <textarea
                className="flex-1 pl-1 border-none outline-none"
                placeholder="I'm feeling..."
                {...form.register("symptoms")}
              />
              <button
                type="submit"
                className="p-0 w-10 h-10 aspect-square btn btn-primary"
              >
                <ArrowUp className="size-4" />
              </button>
            </div>
            {form.formState.errors.symptoms && (
              <div
                role="alert"
                className="border border-error/30 rounded-xl alert alert-error alert-soft"
              >
                <span>Error! {form.formState.errors.symptoms.message}</span>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default DiagnosisForm;
