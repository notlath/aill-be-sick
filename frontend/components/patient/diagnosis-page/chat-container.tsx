import Markdown from "react-markdown";
import ChatBubble from "./chat-bubble";
import { Message, TempDiagnosis } from "@/app/generated/prisma";
import remarkBreaks from "remark-breaks";
import { forwardRef } from "react";
import { LocationData } from "@/utils/location";
import QuestionBubble from "./question-bubble";
import { Explanation } from "@/types";

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
    },
    ref
  ) => {
    return (
      <section className="flex flex-col flex-1 space-x-auto space-y-2 py-8 w-full max-w-[768px]">
        {messages.map((message, idx) => (
          <ChatBubble
            key={message.id + message.content}
            messagesLength={messages.length}
            idx={idx}
            chatHasDiagnosis={hasDiagnosis}
            isGettingExplanations={isGettingExplanations}
            explanation={message.explanation || dbExplanation || null}
            location={location}
            tempDiagnosis={message.tempDiagnosis}
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
            <div>
              <Markdown
                remarkPlugins={[remarkBreaks]}
                components={{
                  p: ({ children }) => <p className="my-2">{children}</p>,
                  strong: ({ children }) => (
                    <strong className="font-bold">{children}</strong>
                  ),
                }}
              >
                Diagnosing...
              </Markdown>
            </div>
          </article>
        )}
        {isGettingQuestion && !currentQuestion && (
          <article className="self-start bg-gray-100 p-3 px-4 rounded-xl max-w-[60%]">
            <div>
              <Markdown
                remarkPlugins={[remarkBreaks]}
                components={{
                  p: ({ children }) => <p className="my-2">{children}</p>,
                  strong: ({ children }) => (
                    <strong className="font-bold">{children}</strong>
                  ),
                }}
              >
                Asking you follow-up questions...
              </Markdown>
            </div>
          </article>
        )}
        {isGettingExplanations && (
          <article className="self-start bg-gray-100 p-3 px-4 rounded-xl max-w-[60%]">
            <div>
              <Markdown
                remarkPlugins={[remarkBreaks]}
                components={{
                  p: ({ children }) => <p className="my-2">{children}</p>,
                  strong: ({ children }) => (
                    <strong className="font-bold">{children}</strong>
                  ),
                }}
              >
                Generating insights for your diagnosis...
              </Markdown>
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
