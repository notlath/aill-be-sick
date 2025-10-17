"use client";

import { useEffect, useRef } from "react";
import ChatContainer from "./chat-container";
import DiagnosisForm from "./diagnosis-form";
import { Message } from "@/app/generated/prisma";
import { useAction, useOptimisticAction } from "next-safe-action/hooks";
import { runDiagnosis } from "@/actions/run-diagnosis";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateDiagnosisSchema,
  CreateDiagnosisSchemaType,
} from "@/schemas/CreateDiagnosisSchema";
import { FormProvider, useForm } from "react-hook-form";
import { createMessage } from "@/actions/create-message";

type ChatWindowProps = {
  chatId: string;
  messages: Message[];
};

const ChatWindow = ({ chatId, messages }: ChatWindowProps) => {
  const form = useForm<CreateDiagnosisSchemaType>({
    defaultValues: {
      symptoms: "",
      chatId,
    },
    resolver: zodResolver(CreateDiagnosisSchema),
  });
  const { execute: runDiagnosisExecute } = useAction(runDiagnosis);
  const { execute: createMessageExecute, optimisticState: optimisticMessages } =
    useOptimisticAction(createMessage, {
      currentState: messages,
      updateFn: (currentMessages, newMessage: any) => {
        const updatedMessages = [...currentMessages, newMessage];

        updatedMessages.push({
          id: -1,
          content: "Diagnosing...",
          role: "AI" as const,
          type: "QUESTION" as const,
          chatId,
          createdAt: new Date(),
        });

        return updatedMessages;
      },
      onSuccess: ({ data }) => {
        if (data.success) {
          runDiagnosisExecute({
            chatId,
            symptoms: form.getValues("symptoms"),
          });
        } else if (data.error) {
          console.error(data.error);
        }
      },
    });
  const hasRunInitialDiagnosis = useRef<boolean>(false);

  useEffect(() => {
    if (messages.length === 1 && !hasRunInitialDiagnosis.current) {
      runDiagnosisExecute({
        chatId,
        symptoms: messages[0].content,
      });

      hasRunInitialDiagnosis.current = true;
    }
  }, [messages.length, chatId, runDiagnosisExecute]);

  return (
    <FormProvider {...form}>
      <ChatContainer messages={optimisticMessages} />
      <div className="mt-auto p-4">
        <DiagnosisForm createMessageExecute={createMessageExecute} />
      </div>
    </FormProvider>
  );
};

export default ChatWindow;
