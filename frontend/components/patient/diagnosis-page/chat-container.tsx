import { Message, TempDiagnosis } from "@/lib/generated/prisma";
import { Explanation } from "@/types";
import { LocationData } from "@/utils/location";
import { forwardRef } from "react";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import ChatBubble from "./chat-bubble";
import QuestionBubble from "./question-bubble";

const MARKDOWN_PLUGINS = [remarkBreaks];

const MARKDOWN_COMPONENTS = {
  p: ({ children }: any) => <p className="my-0">{children}</p>,
  strong: ({ children }: any) => (
    <strong className="font-bold">{children}</strong>
  ),
};

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
        {(isDiagnosing || isCreatingMessage) && (
          <article className="self-start bg-gray-100 p-3 px-4 rounded-xl max-w-[60%]">
            <div className="flex items-center gap-1.5">
              <Markdown
                remarkPlugins={MARKDOWN_PLUGINS}
                components={MARKDOWN_COMPONENTS}
              >
                Diagnosing
              </Markdown>
              <span className="loading loading-dots loading-xs"></span>
            </div>
          </article>
        )}
        {isGettingQuestion && !currentQuestion && (
          <article className="self-start bg-gray-100 p-3 px-4 rounded-xl max-w-[60%]">
            <div className="flex items-center gap-1.5">
              <Markdown
                remarkPlugins={MARKDOWN_PLUGINS}
                components={MARKDOWN_COMPONENTS}
              >
                Asking you follow-up questions
              </Markdown>
              <span className="loading loading-dots loading-xs"></span>
            </div>
          </article>
        )}
        {isGettingExplanations && (
          <article className="self-start bg-gray-100 p-3 px-4 rounded-xl max-w-[60%]">
            <div className="flex items-center gap-1.5">
              <Markdown
                remarkPlugins={MARKDOWN_PLUGINS}
                components={MARKDOWN_COMPONENTS}
              >
                Generating insights for your diagnosis
              </Markdown>
              <span className="loading loading-dots loading-xs"></span>
            </div>
          </article>
        )}
        <div ref={ref} />
      </section>
    );
  }
);

ChatContainer.displayName = "ChatContainer";

export default ChatContainer;
