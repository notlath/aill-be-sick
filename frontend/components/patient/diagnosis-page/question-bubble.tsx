"use client";

import { cn } from "@/utils/lib";

type QuestionBubbleProps = {
  question: string;
  questionId: string;
  positiveSymptom: string;
  negativeSymptom: string;
  onAnswer: (answer: "yes" | "no", symptom: string, questionId: string) => void;
  disabled?: boolean;
};

const QuestionBubble = ({
  question,
  questionId,
  positiveSymptom,
  negativeSymptom,
  onAnswer,
  disabled = false,
}: QuestionBubbleProps) => {
  return (
    <article
      className="self-start bg-base-200 text-base-content p-4 rounded-xl max-w-[60%] shadow-sm"
      role="group"
      aria-labelledby={`q-${questionId}`}
    >
      <div className="mb-4">
        <p id={`q-${questionId}`} className="font-medium">
          {question}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => onAnswer("yes", positiveSymptom, questionId)}
          disabled={disabled}
          className={cn(
            "flex-1 btn btn-sm group relative",
            disabled ? "btn-disabled" : "btn-success",
          )}
          aria-label={`Yes, I have ${positiveSymptom}`}
        >
          Yes
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block tooltip tooltip-top bg-neutral text-neutral-content text-xs rounded px-2 py-1 whitespace-nowrap">
            {positiveSymptom}
          </span>
        </button>
        <button
          onClick={() => onAnswer("no", negativeSymptom, questionId)}
          disabled={disabled}
          className={cn(
            "flex-1 btn btn-sm group relative",
            disabled ? "btn-disabled" : "btn-error",
          )}
          aria-label={`No, I don't have ${positiveSymptom}`}
        >
          No
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block tooltip tooltip-top bg-neutral text-neutral-content text-xs rounded px-2 py-1 whitespace-nowrap">
            {negativeSymptom}
          </span>
        </button>
      </div>
    </article>
  );
};

export default QuestionBubble;
