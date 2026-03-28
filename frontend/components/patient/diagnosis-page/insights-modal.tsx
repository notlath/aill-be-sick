"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useAction } from "next-safe-action/hooks";
import { ChevronDown, ChevronUp, Lightbulb, Sparkles, Info, AlertCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { generateInsightsExplanation } from "@/actions/generate-insights-explanation";
import { processTokensForDisplay, type TokenWithImportance } from "@/utils/shap-tokens";
import { getImportanceStyle } from "@/utils/importance-color";

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
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [topWords, setTopWords] = useState<string[]>([]);
  const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false);

  // Process tokens for display (merge subwords, filter special tokens, normalize)
  const processedTokens = useMemo<TokenWithImportance[]>(() => {
    if (tokens.length === 0 || importances.length === 0) return [];
    return processTokensForDisplay(tokens, importances);
  }, [tokens, importances]);

  // Server action for generating plain-English explanation
  const { execute, isPending, hasErrored } = useAction(generateInsightsExplanation, {
    onSuccess: (result) => {
      if (result.data?.success) {
        setExplanation(result.data.explanation);
        setTopWords(result.data.topTokens || []);
      }
    },
  });

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
    const modal = document.getElementById("insights_modal") as HTMLDialogElement | null;
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
              How the AI reached this suggestion
            </h3>
            <p className="text-sm text-base-content/60">
              Understanding what influenced the result
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
                      <span className="text-xs text-base-content/60 mr-1">Key words:</span>
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
                  We could not generate a simple explanation at this time. You can still view the technical details below.
                </p>
              </div>
            </div>
          ) : !canGenerateExplanation ? (
            <div className="p-4 rounded-xl bg-base-200 border border-base-300">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-base-content/40 mt-0.5 shrink-0" />
                <p className="text-sm text-base-content/70">
                  The AI analyzed your symptoms to reach this suggestion. See the technical details below for a breakdown of which words were most influential.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Educational Note */}
        <div className="mb-4 p-3 rounded-lg bg-base-200 border border-base-300">
          <p className="text-xs text-base-content/70 leading-relaxed">
            <strong className="text-base-content">Why are some words highlighted?</strong>{" "}
            AI models read text differently than humans. They may give weight to grammar, context words, or parts of words to understand your symptoms. The highlighted words below show what the AI focused on most.
          </p>
        </div>

        {/* Technical Details Toggle */}
        <div className="border-t border-base-300 pt-4">
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="flex items-center justify-between w-full p-3 rounded-lg bg-base-200 hover:bg-base-300 transition-colors cursor-pointer group border border-transparent hover:border-base-300"
            aria-expanded={showTechnicalDetails}
          >
            <span className="text-sm font-medium text-base-content">
              {showTechnicalDetails ? "Hide" : "View"} Technical AI Data
            </span>
            {showTechnicalDetails ? (
              <ChevronUp className="w-4 h-4 text-base-content/50 group-hover:text-base-content transition-colors" />
            ) : (
              <ChevronDown className="w-4 h-4 text-base-content/50 group-hover:text-base-content transition-colors" />
            )}
          </button>

          {/* Collapsible Heatmap Section */}
          {showTechnicalDetails && (
            <div className="mt-4 p-4 rounded-xl bg-base-300/30 border border-base-300">
              <h4 className="text-sm font-semibold text-base-content mb-3">
                Word Importance Heatmap
              </h4>
              <p className="text-xs text-base-content/60 mb-4">
                Words with stronger highlighting had more influence on the AI's suggestion.
              </p>

              {/* Token Heatmap */}
              <div className="flex flex-wrap gap-1.5 items-center max-h-48 overflow-y-auto pr-2 pb-1">
                {processedTokens.length > 0 ? (
                  processedTokens.map((t, i) => (
                    <span
                      key={`${t.token}-${i}`}
                      className="text-sm font-medium transition-colors rounded"
                      style={getImportanceStyle(t.importance, isDark)}
                      title={`Importance: ${(t.importance * 100).toFixed(1)}%`}
                    >
                      {t.token}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-base-content/50 italic">
                    No token data available.
                  </p>
                )}
              </div>

              {/* Legend */}
              {processedTokens.length > 0 && (
                <div className="mt-4 pt-3 border-t border-base-300">
                  <p className="text-xs text-base-content/60 mb-2">Importance scale:</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className="px-2 py-0.5 rounded border border-base-content/10"
                      style={getImportanceStyle(0.1, isDark)}
                    >
                      Low
                    </span>
                    <span className="text-base-content/40">&rarr;</span>
                    <span
                      className="px-2 py-0.5 rounded border border-base-content/10"
                      style={getImportanceStyle(0.5, isDark)}
                    >
                      Medium
                    </span>
                    <span className="text-base-content/40">&rarr;</span>
                    <span
                      className="px-2 py-0.5 rounded font-bold border border-base-content/10"
                      style={getImportanceStyle(0.9, isDark)}
                    >
                      High
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-base-300 mt-auto shrink-0">
          <p className="text-xs text-base-content/50 text-center">
            This explanation is for educational purposes only. Always consult a healthcare provider for medical advice.
          </p>
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
