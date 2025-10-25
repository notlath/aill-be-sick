"use client";

import { cn } from "@/utils/lib";

type QuestionBubbleProps = {
  question: string;
  questionId: string;
  positiveSymptom: string;
  negativeSymptom: string;
  category?: string;
  onAnswer: (answer: "yes" | "no", symptom: string, questionId: string) => void;
  disabled?: boolean;
  progress?: string;
};

const QuestionBubble = ({
  question,
  questionId,
  positiveSymptom,
  negativeSymptom,
  category,
  onAnswer,
  disabled = false,
}: QuestionBubbleProps) => {
  return (
    <article
      className="self-start bg-gray-200 p-4 rounded-xl max-w-[60%] shadow-sm"
      role="group"
      aria-labelledby={`q-${questionId}`}
    >
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
    </article>
  );
};

export default QuestionBubble;
