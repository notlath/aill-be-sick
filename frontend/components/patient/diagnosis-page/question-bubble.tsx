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
        <p id={`q-${questionId}`}>{question}</p>
      </div>
      <div className="flex gap-3">
        <div className="tooltip tooltip-top flex-1" data-tip={positiveSymptom}>
          <button
            type="button"
            onClick={() => onAnswer("yes", positiveSymptom, questionId)}
            disabled={disabled}
            className={cn(
              "w-full btn btn-sm cursor-pointer transition-colors duration-200",
              disabled ? "btn-disabled" : "btn-success",
            )}
            aria-label={`Yes, I have ${positiveSymptom}`}
          >
            Yes
          </button>
        </div>
        <div className="tooltip tooltip-top flex-1" data-tip={negativeSymptom}>
          <button
            type="button"
            onClick={() => onAnswer("no", negativeSymptom, questionId)}
            disabled={disabled}
            className={cn(
              "w-full btn btn-sm cursor-pointer transition-colors duration-200",
              disabled ? "btn-disabled" : "btn-error",
            )}
            aria-label={`No, I don't have ${positiveSymptom}`}
          >
            No
          </button>
        </div>
      </div>
    </article>
  );
};

export default QuestionBubble;
