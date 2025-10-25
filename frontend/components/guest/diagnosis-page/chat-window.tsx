"use client";

import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import useMessagesStore from "@/stores/messages-store";
import { useAction } from "next-safe-action/hooks";
import { runTempDiagnosis } from "@/actions/run-temp-diagnosis";
import ChatContainer from "./chat-container";

const ChatWindow = () => {
  const form = useForm();
  const [error, setError] = useState<{
    error: string;
    message: string;
    detectedLanguage: string;
  } | null>(null);
  const { messages, addMessage } = useMessagesStore();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasScrolledToBottom = useRef<boolean>(false);
  const { execute, isExecuting: isDiagnosing } = useAction(runTempDiagnosis, {
    onSuccess: ({ data }) => {
      if (data.success) {
        addMessage({
          ...data.success,
          type: "DIAGNOSIS",
          role: "AI",
        });
      } else if (data.error) {
        // TODO: Error handling
        console.error(data.error);

        if (data.error === "UNSUPPORTED_LANGUAGE") {
          setError({
            error: data.error,
            message: data.message,
            detectedLanguage: data.detectedLanguage,
          });
        }
      }
    },
  });

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    if (lastMessage && lastMessage.type === "SYMPTOMS") {
      execute({ symptoms: lastMessage.content });
    }
  }, [messages]);

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

  useEffect(() => {
    if (hasScrolledToBottom.current && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

  return messages.length === 0 ? null : (
    <div className="flex-1 mx-auto pb-4 max-w-[768px]">
      <FormProvider {...form}>
        <ChatContainer
          ref={chatEndRef}
          messages={messages}
          isPending={isDiagnosing}
        />
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
        <dialog id="diagnosis_error_modal" className="modal">
          <div className="modal-box">
            <form method="dialog">
              <button className="top-2 right-2 absolute btn btn-sm btn-circle btn-ghost">
                ✕
              </button>
            </form>
            <h3 className="font-bold text-lg">Diagnosis error</h3>
            <p className="py-4 text-muted">{error?.message}</p>
          </div>
        </dialog>
      </FormProvider>
    </div>
  );
};

export default ChatWindow;
