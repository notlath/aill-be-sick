"use client";

import {
  CreateTempChatSchema,
  CreateTempChatSchemaType,
} from "@/schemas/CreateTempChatSchema";
import useMessagesStore from "@/stores/messages-store";
import { cn } from "@/utils/lib";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUp } from "lucide-react";
import { useForm } from "react-hook-form";

const TempDiagnosisForm = () => {
  const form = useForm<CreateTempChatSchemaType>({
    defaultValues: {
      symptoms: "",
    },
    resolver: zodResolver(CreateTempChatSchema),
  });
  const { messages, addMessage } = useMessagesStore();

  const handleSubmit = (data: CreateTempChatSchemaType) => {
    const text = (data?.symptoms ?? "").trim();

    if (!text) return;

    addMessage({ content: text, role: "USER", type: "SYMPTOMS" });

    form.reset();
  };

  return (
    <>
      {messages.length > 0 ? null : (
        <div className="space-y-4 text-center">
          <h1 className="font-semibold text-5xl text-center">
            How are you feeling today?
          </h1>
          <p className="text-muted">Describe your symptoms</p>
        </div>
      )}
      <div
        className={cn(
          "bg-base-200 pb-4",
          messages.length > 0 && "fixed bottom-2"
        )}
      >
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
    </>
  );
};

export default TempDiagnosisForm;
