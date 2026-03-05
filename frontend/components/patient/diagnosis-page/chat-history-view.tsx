"use client";

import { useUserLocation } from "@/hooks/use-location";
import { Chat, Explanation, Message } from "@/lib/generated/prisma";
import { Explanation as TempExplanation } from "@/types";
import { useEffect } from "react";
import ChatContainer from "./chat-container";

type ChatHistoryViewProps = {
  chatId: string;
  messages: Message[];
  chat: Chat;
  dbExplanation: Explanation | null;
  userRole?: string;
};

/**
 * Read-only view for completed diagnoses (viewed from history or after recording).
 *
 * This component has ZERO diagnosis/follow-up logic — no runDiagnosis,
 * no getFollowUpQuestion, no createMessage. It simply renders the stored
 * messages. This architectural separation guarantees that viewing a saved
 * diagnosis can never re-trigger the diagnosis engine.
 */
const ChatHistoryView = ({
  chatId,
  messages,
  chat,
  dbExplanation,
  userRole,
}: ChatHistoryViewProps) => {
  const { location, requestLocation } = useUserLocation();

  // Only request location if the diagnosis hasn't been formally recorded yet
  // (user completed the flow but didn't click "Record diagnosis").
  // When hasDiagnosis is true the record button is disabled so location is unused.
  useEffect(() => {
    if (!chat.hasDiagnosis) {
      requestLocation();
    }
  }, [chat.hasDiagnosis, requestLocation]);

  return (
    <>
      <ChatContainer
        messages={messages as any}
        isGettingQuestion={false}
        isDiagnosing={false}
        isGettingExplanations={false}
        isCreatingMessage={false}
        hasDiagnosis={chat.hasDiagnosis}
        location={location}
        currentQuestion={null}
        dbExplanation={dbExplanation as unknown as TempExplanation}
        userRole={userRole}
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
    </>
  );
};

export default ChatHistoryView;
