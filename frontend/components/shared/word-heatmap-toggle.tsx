"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type TokenWithImportance } from "@/utils/shap-tokens";
import { getImportanceStyle } from "@/utils/importance-color";

type WordHeatmapToggleProps = {
  processedTokens: TokenWithImportance[];
  isDark: boolean;
  isLoading?: boolean;
};

export function WordHeatmapToggle({
  processedTokens,
  isDark,
  isLoading = false,
}: WordHeatmapToggleProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  return (
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

      {showTechnicalDetails && (
        <div className="mt-4 p-4 rounded-xl bg-base-300/30 border border-base-300">
          {isLoading ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-base-200 border border-base-300">
              <span className="loading loading-spinner loading-sm text-info"></span>
              <p className="text-sm text-base-content/70">
                Loading technical details...
              </p>
            </div>
          ) : processedTokens.length > 0 ? (
            <>
              <h4 className="text-sm font-semibold text-base-content mb-3">
                Word Importance Heat Map
              </h4>
              <p className="text-xs text-base-content/60 mb-4">
                Words with stronger highlighting had more influence on the AI&apos;s suggestion.
              </p>

              <div className="flex flex-wrap gap-1.5 items-center max-h-48 overflow-y-auto pr-2 pb-1">
                {processedTokens.map((t, i) => (
                  <span
                    key={`${t.token}-${i}`}
                    className="text-sm font-medium transition-colors rounded"
                    style={getImportanceStyle(t.importance, isDark)}
                    title={`Importance: ${(t.importance * 100).toFixed(1)}%`}
                  >
                    {t.token}
                  </span>
                ))}
              </div>

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
            </>
          ) : (
            <div className="p-4 rounded-xl bg-base-200 border border-base-300">
              <div className="flex items-start gap-3">
                <p className="text-sm text-base-content/70">
                  No technical explanation data available for this diagnosis.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
