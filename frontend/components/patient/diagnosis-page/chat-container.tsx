import LazyMarkdown from "@/components/ui/lazy-markdown";
import { Message, TempDiagnosis } from "@/lib/generated/prisma";
import { Explanation } from "@/types";
import { forwardRef, memo } from "react";
import ChatBubble from "./chat-bubble";
import QuestionBubble from "./question-bubble";

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
  currentQuestion?: {
    id: string;
    question: string;
    positive_symptom: string;
    negative_symptom: string;
    reasoning?: string;
  } | null;
  onQuestionAnswer?: (
    answer: "yes" | "no",
    symptom: string,
    questionId: string,
  ) => void;
  dbExplanation: Explanation | null;
  userRole?: string;
};

/**
 * Custom comparison function to prevent unnecessary re-renders.
 * Only re-renders when messages array length changes or primitive props change.
 * This is a shallow comparison optimized for the chat use case.
 */
function areChatContainerPropsEqual(
  prev: ChatContainerProps,
  next: ChatContainerProps,
): boolean {
  // Re-render if message count changes (new message added/removed)
  if (prev.messages.length !== next.messages.length) return false;

  // Re-render if any loading state changes
  if (
    prev.isCreatingMessage !== next.isCreatingMessage ||
    prev.isDiagnosing !== next.isDiagnosing ||
    prev.isGettingQuestion !== next.isGettingQuestion ||
    prev.isGettingExplanations !== next.isGettingExplanations
  )
    return false;

  // Re-render if question changes
  if (prev.currentQuestion?.id !== next.currentQuestion?.id) return false;

  // Re-render if diagnosis state changes
  if (prev.hasDiagnosis !== next.hasDiagnosis) return false;

  // Re-render if any message's explanation changed
  // This is critical for the "View Insights" button to enable after explanations load
  for (let i = 0; i < prev.messages.length; i++) {
    const prevMsg = prev.messages[i];
    const nextMsg = next.messages[i];

    // Check if message IDs match (should always be true if length is same)
    if (prevMsg.id !== nextMsg.id) return false;

    // Check if explanation state changed
    const prevHasExplanation = !!prevMsg.explanation;
    const nextHasExplanation = !!nextMsg.explanation;
    if (prevHasExplanation !== nextHasExplanation) return false;
  }

  // Skip re-render if only message array reference changed but content is same
  return true;
}

const ChatContainer = memo(
  forwardRef<HTMLDivElement, ChatContainerProps>(
    (
      {
        messages,
        isCreatingMessage,
        isDiagnosing,
        isGettingQuestion,
        isGettingExplanations,
        hasDiagnosis,
        currentQuestion,
        onQuestionAnswer,
        dbExplanation,
        userRole,
      },
      ref,
    ) => {
      return (
        <section className="flex flex-col flex-1 space-y-2 py-8 px-4 w-full max-w-[768px]">
          {messages.map((message, idx) => (
            <ChatBubble
              key={message.id ? `${message.id}-${idx}` : `msg-${idx}`}
              messagesLength={messages.length}
              idx={idx}
              chatHasDiagnosis={hasDiagnosis}
              isGettingExplanations={isGettingExplanations}
              explanation={message.explanation || dbExplanation || null}
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
              reasoning={currentQuestion.reasoning}
              onAnswer={onQuestionAnswer}
              disabled={isCreatingMessage || isDiagnosing}
            />
          )}
          {(isDiagnosing || isCreatingMessage) && (
            <article className="self-start bg-gray-100 p-3 px-4 rounded-xl max-w-[60%]">
              <div className="flex items-center gap-1.5">
                <LazyMarkdown components={MARKDOWN_COMPONENTS}>
                  Diagnosing
                </LazyMarkdown>
                <span className="loading loading-dots loading-xs"></span>
              </div>
            </article>
          )}
          {isGettingQuestion && !currentQuestion && (
            <article className="self-start bg-gray-100 p-3 px-4 rounded-xl max-w-[60%]">
              <div className="flex items-center gap-1.5">
                <LazyMarkdown components={MARKDOWN_COMPONENTS}>
                  Asking you follow-up questions
                </LazyMarkdown>
                <span className="loading loading-dots loading-xs"></span>
              </div>
            </article>
          )}
          {isGettingExplanations && (
            <article className="self-start bg-gray-100 p-3 px-4 rounded-xl max-w-[60%]">
              <div className="flex items-center gap-1.5">
                <LazyMarkdown components={MARKDOWN_COMPONENTS}>
                  Generating insights for your diagnosis
                </LazyMarkdown>
                <span className="loading loading-dots loading-xs"></span>
              </div>
            </article>
          )}
          <div ref={ref} />
        </section>
      );
    },
  ),
  areChatContainerPropsEqual,
);

ChatContainer.displayName = "ChatContainer";

export default ChatContainer;
