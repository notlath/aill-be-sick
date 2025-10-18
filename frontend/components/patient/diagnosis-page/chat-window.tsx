"use client";

import { useEffect, useRef } from "react";
import ChatContainer from "./chat-container";
import DiagnosisForm from "./diagnosis-form";
import { Message } from "@/app/generated/prisma";
import { useAction, useOptimisticAction } from "next-safe-action/hooks";
import { runDiagnosis } from "@/actions/run-diagnosis";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateChatSchema,
  CreateChatSchemaType,
} from "@/schemas/CreateChatSchema";
import { FormProvider, useForm } from "react-hook-form";
import { createMessage } from "@/actions/create-message";

type ChatWindowProps = {
  chatId: string;
  messages: Message[];
};

const ChatWindow = ({ chatId, messages }: ChatWindowProps) => {
  const form = useForm<CreateChatSchemaType>({
    defaultValues: {
      symptoms: "",
      chatId,
    },
    resolver: zodResolver(CreateChatSchema),
  });
  const { execute: runDiagnosisExecute, isExecuting: isDiagnosing } =
    useAction(runDiagnosis);
  const {
    execute: createMessageExecute,
    optimisticState: optimisticMessages,
    isExecuting: isCreatingMessage,
  } = useOptimisticAction(createMessage, {
    currentState: messages,
    updateFn: (currentMessages, newMessage: any) => {
      const updatedMessages = [...currentMessages, newMessage];

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
      <ChatContainer
        messages={optimisticMessages}
        isPending={isDiagnosing || isCreatingMessage}
      />
      <div className="-bottom-0.5 sticky bg-base-200 p-4 pt-0">
        <DiagnosisForm
          createMessageExecute={createMessageExecute}
          isPending={isDiagnosing || isCreatingMessage}
        />
      </div>
    </FormProvider>
  );
};

export default ChatWindow;
