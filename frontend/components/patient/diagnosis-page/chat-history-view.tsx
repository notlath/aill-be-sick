"use client";

import { Chat, Explanation, Message } from "@/lib/generated/prisma";
import { Explanation as TempExplanation } from "@/types";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import ChatContainer from "./chat-container";

const CDSSSummary = dynamic(() => import("./cdss-summary"));

type ChatHistoryViewProps = {
  chatId: string;
  messages: (Message & { explanation?: Explanation | null })[];
  chat: Chat;
  dbExplanation: Explanation | null;
  userRole?: string;
  dbCdss?: any | null;
  dbConfidence?: number | null;
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
  dbCdss,
  dbConfidence,
}: ChatHistoryViewProps) => {
  const processedMessages = useMemo(
    () =>
      messages.map((msg) => ({
        ...msg,
        explanation: msg.explanation || dbExplanation,
      })),
    [messages, dbExplanation],
  );

  return (
    <>
      <ChatContainer
        messages={processedMessages as any}
        isGettingQuestion={false}
        isDiagnosing={false}
        isGettingExplanations={false}
        isCreatingMessage={false}
        hasDiagnosis={chat.hasDiagnosis}
        currentQuestion={null}
        dbExplanation={dbExplanation as unknown as TempExplanation}
        userRole={userRole}
      />
      {dbCdss && (dbConfidence ?? 0) >= 0.95 && (
        <div className="w-full max-w-[768px] mx-auto mt-3 px-4">
          <CDSSSummary cdss={dbCdss} />
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
    </>
  );
};

export default ChatHistoryView;
