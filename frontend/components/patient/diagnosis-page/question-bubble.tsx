"use client";

import { cn } from "@/utils/lib";

type QuestionBubbleProps = {
  question: string;
  questionId: string;
  positiveSymptom: string;
  negativeSymptom: string;
  category?: string;
  reasoning?: string;
  onAnswer: (answer: "yes" | "no", symptom: string, questionId: string) => void;
  onSkipToResults?: () => void;
  disabled?: boolean;
  progress?: string;
};

const QuestionBubble = ({
  question,
  questionId,
  positiveSymptom,
  negativeSymptom,
  category,
  reasoning,
  onAnswer,
  onSkipToResults,
  disabled = false,
}: QuestionBubbleProps) => {
  return (
    <article
      className="self-start bg-base-200 text-base-content p-4 rounded-xl max-w-[60%] shadow-sm"
      role="group"
      aria-labelledby={`q-${questionId}`}
    >
      {reasoning && (
        <p className="text-xs text-base-content/60 mb-2 italic">{reasoning}</p>
      )}
      <div className="mb-4">
        <p id={`q-${questionId}`} className="font-medium">
          {question}
        </p>
        {category && (
          <div className="mt-2">
            <span
              className={`badge badge-sm ${
                category === "primary" ? "badge-primary" : "badge-ghost"
              }`}
            >
              {category}
            </span>
            <small className="text-xs text-muted ml-2">Preview: {positiveSymptom}</small>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-3">
          <button
            onClick={() => onAnswer("yes", positiveSymptom, questionId)}
            disabled={disabled}
            className={cn(
              "flex-1 btn btn-sm",
              disabled ? "btn-disabled" : "btn-success"
            )}
            aria-label={`Yes, I have ${positiveSymptom}`}
          >
            Yes
          </button>
          <button
            onClick={() => onAnswer("no", negativeSymptom, questionId)}
            disabled={disabled}
            className={cn(
              "flex-1 btn btn-sm",
              disabled ? "btn-disabled" : "btn-error"
            )}
            aria-label={`No, I don't have ${positiveSymptom}`}
          >
            No
          </button>
        </div>
        {onSkipToResults && (
          <button
            onClick={onSkipToResults}
            disabled={disabled}
            className={cn(
              "btn btn-sm btn-ghost text-xs",
              disabled && "btn-disabled"
            )}
            aria-label="Skip remaining questions and see results"
          >
            Skip to Results
          </button>
        )}
      </div>
    </article>
  );
};

export default QuestionBubble;
