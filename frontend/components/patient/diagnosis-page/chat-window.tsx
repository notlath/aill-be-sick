"use client";

import { useEffect, useRef } from "react";
import ChatContainer from "./chat-container";
import DiagnosisForm from "./diagnosis-form";
import { Chat, Message } from "@/app/generated/prisma";
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
  chat: Chat;
};

const ChatWindow = ({ chatId, messages, chat }: ChatWindowProps) => {
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasScrolledToBottom = useRef<boolean>(false);

  // Smooth scroll to bottom on initial load
  useEffect(() => {
    if (chatEndRef.current && !hasScrolledToBottom.current) {
      const scrollToBottom = () => {
        const element = chatEndRef.current;
        if (!element) return;

        // Get the target position (bottom of the page)
        const targetPosition =
          element.getBoundingClientRect().top + window.scrollY;

        // Calculate starting position (25% above the bottom)
        const viewportHeight = window.innerHeight;
        const startPosition = targetPosition - viewportHeight * 1.25;

        // Scroll to starting position instantly, then smoothly to bottom
        window.scrollTo({
          top: Math.max(0, startPosition),
          behavior: "instant",
        });

        // Use setTimeout to ensure the instant scroll completes first
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 50);

        hasScrolledToBottom.current = true;
      };

      // Small delay to ensure content is rendered
      setTimeout(scrollToBottom, 100);
    }
  }, []);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (hasScrolledToBottom.current && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [optimisticMessages.length]);

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
        ref={chatEndRef}
        messages={optimisticMessages}
        isPending={isDiagnosing || isCreatingMessage}
        hasDiagnosis={chat.hasDiagnosis}
      />
      {!chat.hasDiagnosis && (
        <div className="-bottom-0.5 sticky bg-base-200 p-4 pt-0">
          <DiagnosisForm
            createMessageExecute={createMessageExecute}
            isPending={isDiagnosing || isCreatingMessage}
          />
        </div>
      )}
      <dialog id="record_success_modal" className="modal">
        <div className="modal-box">
          <form method="dialog">
            <button className="top-2 right-2 absolute btn btn-sm btn-circle btn-ghost">
              ✕
            </button>
          </form>
          <h3 className="font-bold text-lg">Diagnosis recorded</h3>
          <p className="py-4 text-muted">
            This diagnosis has been successfully stored and saved in the
            records!
          </p>
        </div>
      </dialog>
    </FormProvider>
  );
};

export default ChatWindow;
