"use client";

import {
  CreateDiagnosisSchema,
  CreateDiagnosisSchemaType,
} from "@/schemas/CreateDiagnosisSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

type DiagnosisFormProps = {
  chatId: string;
};

const DiagnosisForm = ({ chatId }: DiagnosisFormProps) => {
  const form = useForm<CreateDiagnosisSchemaType>({
    defaultValues: {
      symptoms: "",
    },
    resolver: zodResolver(CreateDiagnosisSchema),
  });
  const router = useRouter();

  const handleSubmit = (data: CreateDiagnosisSchemaType) => {};

  return (
    <div className="flex justify-center items-center">
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-16 w-[800px] text-center">
          <div className="space-y-8">
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
