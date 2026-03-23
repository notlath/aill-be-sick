"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { generateBmiAdvice } from "@/actions/generate-bmi-advice";
import { Activity, Scale, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface BmiAdviceSectionProps {
  diagnosisId: number;
  initialData?: {
    heightCm: number | null;
    weightKg: number | null;
    bmiAdvice: string | null;
  };
}

export default function BmiAdviceSection({
  diagnosisId,
  initialData,
}: BmiAdviceSectionProps) {
  const [isOpen, setIsOpen] = useState(!!initialData?.bmiAdvice);
  const [heightCm, setHeightCm] = useState<string>(
    initialData?.heightCm?.toString() || ""
  );
  const [weightKg, setWeightKg] = useState<string>(
    initialData?.weightKg?.toString() || ""
  );
  const [localAdvice, setLocalAdvice] = useState<string | null>(
    initialData?.bmiAdvice || null
  );

  const { execute, status } = useAction(generateBmiAdvice, {
    onSuccess: (data) => {
      if (data.data?.success && data.data?.advice) {
        setLocalAdvice(data.data.advice);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const height = parseFloat(heightCm);
    const weight = parseFloat(weightKg);
    
    if (isNaN(height) || isNaN(weight)) return;
    
    execute({
      diagnosisId,
      heightCm: height,
      weightKg: weight,
    });
  };

  const getBmiCategoryColor = (bmi: number) => {
    if (bmi < 18.5) return "text-info";
    if (bmi >= 25 && bmi < 29.9) return "text-warning";
    if (bmi >= 30) return "text-error";
    return "text-success";
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-base-100 shadow-sm overflow-hidden transition-all duration-300">
      <div 
        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-base-200/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl text-primary">
            <Scale className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base-content leading-none">
              Personalized Health & Weight Advice
            </h3>
            <p className="text-xs text-base-content/60 mt-1">
              {localAdvice 
                ? "View your personalized health recommendations" 
                : "Enter your height and weight for tailored AI advice"}
            </p>
          </div>
        </div>
        <button className="btn btn-circle btn-ghost btn-sm text-base-content/50">
          {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>

      {isOpen && (
        <CardContent className="pt-0 pb-5 px-5 border-t border-base-200 mt-2">
          {!localAdvice ? (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-base-content/70">Height (cm)</label>
                  <Input
                    type="number"
                    min="50"
                    max="300"
                    step="0.1"
                    placeholder="e.g. 170"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    required
                    className="bg-base-100 border-base-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-base-content/70">Weight (kg)</label>
                  <Input
                    type="number"
                    min="2"
                    max="500"
                    step="0.1"
                    placeholder="e.g. 65"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    required
                    className="bg-base-100 border-base-300"
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary w-full gap-2"
                disabled={status === "executing" || !heightCm || !weightKg}
              >
                {status === "executing" ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Activity className="size-4" />
                    Get Health Advice
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="mt-4 animate-in fade-in duration-500">
              {heightCm && weightKg && (
                <div className="mb-4 flex items-center gap-4 text-sm bg-base-100/60 p-3 rounded-lg border border-base-200">
                  <div>
                    <span className="text-base-content/60">Height:</span>{" "}
                    <span className="font-medium">{heightCm} cm</span>
                  </div>
                  <div>
                    <span className="text-base-content/60">Weight:</span>{" "}
                    <span className="font-medium">{weightKg} kg</span>
                  </div>
                  <div>
                    <span className="text-base-content/60">BMI:</span>{" "}
                    <span className={`font-bold ${getBmiCategoryColor(parseFloat(weightKg) / Math.pow(parseFloat(heightCm) / 100, 2))}`}>
                      {(parseFloat(weightKg) / Math.pow(parseFloat(heightCm) / 100, 2)).toFixed(1)}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-p:text-base-content/80 text-sm bg-primary/5 p-4 rounded-xl border border-primary/10">
                {localAdvice.split("\n\n").map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
              
              <button 
                onClick={() => setLocalAdvice(null)}
                className="btn btn-ghost btn-sm mt-3 text-xs text-base-content/50"
              >
                Update measurements
              </button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}