import Markdown from "react-markdown";
import ChatBubble from "./chat-bubble";
import { Message } from "@/app/generated/prisma";
import remarkBreaks from "remark-breaks";
import { forwardRef } from "react";
import { LocationData } from "@/utils/location";
import QuestionBubble from "./question-bubble";

type ChatContainerProps = {
  messages: Message[];
  isPending: boolean;
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
};

const ChatContainer = forwardRef<HTMLDivElement, ChatContainerProps>(
  (
    {
      messages,
      isPending,
      hasDiagnosis,
      location,
      currentQuestion,
      onQuestionAnswer,
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
            location={location}
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
            disabled={isPending}
          />
        )}
        {isPending && !currentQuestion && (
          <article className="self-start bg-gray-200 p-3 px-4 rounded-xl max-w-[60%]">
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
        <div ref={ref} />
      </section>
    );
  }
);

ChatContainer.displayName = "ChatContainer";

export default ChatContainer;
