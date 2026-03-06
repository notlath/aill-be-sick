import { Message, TempDiagnosis } from "@/lib/generated/prisma";
import { Explanation } from "@/types";
import { LocationData } from "@/utils/location";
import { forwardRef } from "react";
import ChatBubble from "./chat-bubble";
import QuestionBubble from "./question-bubble";

type ChatContainerProps = {
  messages: (Message & {
    tempDiagnosis?: TempDiagnosis;
    explanation?: Explanation;
  })[];
  isCreatingMessage: boolean;
  isDiagnosing: boolean;
  isGettingQuestion: boolean;
  isGettingExplanations: boolean;
  hasDiagnosis?: boolean;
  location?: LocationData | null;
  currentQuestion?: {
    id: string;
    question: string;
    positive_symptom: string;
    negative_symptom: string;
  } | null;
  onQuestionAnswer?: (
    answer: "yes" | "no",
    symptom: string,
    questionId: string
  ) => void;
  dbExplanation: Explanation | null;
  userRole?: string;
};

const ChatContainer = forwardRef<HTMLDivElement, ChatContainerProps>(
  (
    {
      messages,
      isCreatingMessage,
      isDiagnosing,
      isGettingQuestion,
      isGettingExplanations,
      hasDiagnosis,
      location,
      currentQuestion,
      onQuestionAnswer,
      dbExplanation,
      userRole,
    },
    ref
  ) => {
    return (
      <section className="flex flex-col flex-1 space-x-auto space-y-2 py-8 w-full max-w-[768px]">
        {messages.map((message, idx) => (
          <ChatBubble
            key={message.id ? `${message.id}-${idx}` : `msg-${idx}`}
            messagesLength={messages.length}
            idx={idx}
            chatHasDiagnosis={hasDiagnosis}
            isGettingExplanations={isGettingExplanations}
            explanation={message.explanation || dbExplanation || null}
            location={location}
            tempDiagnosis={message.tempDiagnosis}
            userRole={userRole}
            {...message}
          />
        ))}
        {currentQuestion && onQuestionAnswer && (
          <QuestionBubble
            question={currentQuestion.question}
            questionId={currentQuestion.id}
            positiveSymptom={currentQuestion.positive_symptom}
            negativeSymptom={currentQuestion.negative_symptom}
            category={(currentQuestion as any).category}
            onAnswer={onQuestionAnswer}
            disabled={isCreatingMessage || isDiagnosing}
          />
        )}
        {(isDiagnosing || isCreatingMessage || (isGettingQuestion && !currentQuestion) || isGettingExplanations) && (
          <article className="self-start bg-base-200 px-4 py-3 rounded-xl max-w-[60%]">
            <span className="loading loading-dots loading-sm"></span>
          </article>
        )}
        <div ref={ref} />
      </section>
    );
  }
);

ChatContainer.displayName = "ChatContainer";

export default ChatContainer;
