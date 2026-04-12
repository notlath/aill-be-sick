"use client";

import { cn } from "@/utils/lib";
import { Check, X } from "lucide-react";

type DiagnosticInterviewProps = {
  question: string;
  questionId: string;
  positiveSymptom: string;
  negativeSymptom: string;
  onAnswer: (answer: "yes" | "no", symptom: string, questionId: string) => void;
  disabled?: boolean;
};

export default function DiagnosticInterview({
  question,
  questionId,
  positiveSymptom,
  negativeSymptom,
  onAnswer,
  disabled = false,
}: DiagnosticInterviewProps) {
  return (
    <div className="w-full py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="card bg-base-100 shadow-md border border-base-200 overflow-hidden w-full max-w-2xl mx-auto">
        <div className="bg-primary/10 px-6 py-3 border-b border-primary/20">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">
            Follow-up Question
          </p>
        </div>
        <div className="card-body p-6">
          <h3 className="text-xl font-medium mb-6 text-base-content leading-relaxed">
            {question}
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <button
              onClick={() => onAnswer("yes", positiveSymptom, questionId)}
              disabled={disabled}
              className={cn(
                "btn btn-lg h-auto py-3 group relative flex flex-col items-center justify-center gap-1",
                disabled ? "btn-disabled" : "btn-primary bg-primary text-primary-content hover:bg-primary/90"
              )}
            >
              <div className="flex items-center gap-2">
                <Check className="size-5" />
                <span className="font-semibold text-lg">Yes</span>
              </div>
              <span className="text-xs opacity-80 font-normal">
                {positiveSymptom}
              </span>
            </button>
            
            <button
              onClick={() => onAnswer("no", negativeSymptom, questionId)}
              disabled={disabled}
              className={cn(
                "btn btn-lg h-auto py-3 group relative flex flex-col items-center justify-center gap-1",
                disabled ? "btn-disabled" : "btn-outline btn-neutral"
              )}
            >
              <div className="flex items-center gap-2">
                <X className="size-5" />
                <span className="font-semibold text-lg">No</span>
              </div>
              <span className="text-xs opacity-80 font-normal">
                {negativeSymptom}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
