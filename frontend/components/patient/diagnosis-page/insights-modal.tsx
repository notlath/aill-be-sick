"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useAction } from "next-safe-action/hooks";
import { Lightbulb, Sparkles, Info, AlertCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { generateInsightsExplanation } from "@/actions/generate-insights-explanation";
import {
  processTokensForDisplay,
  type TokenWithImportance,
} from "@/utils/shap-tokens";
import { WordHeatmapToggle } from "@/components/shared/word-heatmap-toggle";

type InsightsModalProps = {
  tokens?: string[];
  importances?: number[];
  disease?: string;
  symptoms?: string;
};

const InsightsModal = ({
  tokens = [],
  importances = [],
  disease = "",
  symptoms = "",
}: InsightsModalProps) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [explanation, setExplanation] = useState<string | null>(null);
  const [topWords, setTopWords] = useState<string[]>([]);
  const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false);

  // Process tokens for display (merge subwords, filter special tokens, normalize)
  const processedTokens = useMemo<TokenWithImportance[]>(() => {
    if (tokens.length === 0 || importances.length === 0) return [];
    return processTokensForDisplay(tokens, importances);
  }, [tokens, importances]);

  // Server action for generating plain-English explanation
  const { execute, isPending, hasErrored } = useAction(
    generateInsightsExplanation,
    {
      onSuccess: (result) => {
        if (result.data?.success) {
          setExplanation(result.data.explanation);
          setTopWords(result.data.topTokens || []);
        }
      },
    },
  );

  // Generate explanation when modal opens (if we have data and haven't tried yet)
  const handleModalOpen = useCallback(() => {
    if (
      !hasAttemptedGeneration &&
      tokens.length > 0 &&
      importances.length > 0 &&
      disease &&
      symptoms
    ) {
      setHasAttemptedGeneration(true);
      execute({ tokens, importances, disease, symptoms });
    }
  }, [tokens, importances, disease, symptoms, hasAttemptedGeneration, execute]);

  // Listen for modal open event
  useEffect(() => {
    const modal = document.getElementById(
      "insights_modal",
    ) as HTMLDialogElement | null;
    if (modal) {
      const handleOpen = () => handleModalOpen();
      modal.addEventListener("open", handleOpen);
      // Also handle when showModal() is called
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === "open" && modal.open) {
            handleModalOpen();
          }
        });
      });
      observer.observe(modal, { attributes: true });
      return () => {
        modal.removeEventListener("open", handleOpen);
        observer.disconnect();
      };
    }
  }, [handleModalOpen]);

  // Reset state when modal closes (for next open)
  const handleClose = () => {
    // Don't reset - keep the explanation cached for this session
  };

  const canGenerateExplanation = disease && symptoms && tokens.length > 0;

  return (
    <dialog id="insights_modal" className="modal" onClose={handleClose}>
      <div className="modal-box max-w-2xl bg-base-100 border border-base-300 shadow-xl max-h-[85vh] flex flex-col">
        {/* Close button */}
        <form method="dialog">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 text-base-content/50 hover:text-base-content">
            <span className="sr-only">Close</span>
            &times;
          </button>
        </form>

        <div className="overflow-y-auto pr-1 -mr-1">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-info/10">
              <Lightbulb className="w-6 h-6 text-info" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-base-content">
                What helped us reach this result
              </h3>
              <p className="text-sm text-base-content/60">
                See which words from your symptoms mattered most
              </p>
            </div>
          </div>

          {/* Plain-English Explanation Section */}
          <div className="mb-6">
            {isPending ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-base-200 border border-base-300">
                <span className="loading loading-spinner loading-sm text-info"></span>
                <p className="text-sm text-base-content/70">
                  Generating a simple explanation...
                </p>
              </div>
            ) : explanation ? (
              <div className="p-4 rounded-xl bg-info/10 border border-info/20">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-info mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-base-content/90 leading-relaxed">
                      {explanation}
                    </p>
                    {topWords.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs text-base-content/60 mr-1">
                          Key words:
                        </span>
                        {topWords.map((word, i) => (
                          <span
                            key={`${word}-${i}`}
                            className="px-2 py-0.5 text-xs font-medium rounded-full bg-info/20 text-info"
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : hasErrored ? (
              <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
                  <p className="text-sm text-warning/90">
                    We could not generate a simple explanation at this time. You
                    can still view the technical details below.
                  </p>
                </div>
              </div>
            ) : !canGenerateExplanation ? (
              <div className="p-4 rounded-xl bg-base-200 border border-base-300">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-base-content/40 mt-0.5 shrink-0" />
                  <p className="text-sm text-base-content/70">
                    The AI analyzed your symptoms to reach this suggestion. See
                    the technical details below for a breakdown of which words
                    were most influential.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Educational Note */}
          <div className="mb-4 p-3 rounded-lg bg-base-200 border border-base-300">
            <p className="text-xs text-base-content/70 leading-relaxed">
              <strong className="text-base-content">
                Why are some words highlighted?
              </strong>{" "}
              The AI looks at every word you shared to find patterns. Words that
              match common symptoms for this condition stand out more. The
              highlights below show which words carried the most weight.
            </p>
          </div>

          {/* Word Heatmap Toggle */}
          <WordHeatmapToggle
            processedTokens={processedTokens}
            isDark={isDark}
          />

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-base-300 shrink-0">
            <p className="text-xs text-base-content/50 text-center">
              This explanation is for educational purposes only. Always consult
              a healthcare provider for medical advice.
            </p>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      <form method="dialog" className="modal-backdrop">
        <button className="cursor-default">close</button>
      </form>
    </dialog>
  );
};

export default InsightsModal;
