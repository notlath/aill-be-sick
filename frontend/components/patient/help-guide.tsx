"use client";

import { MessageSquare, History, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/utils/lib";

interface HelpGuideProps {
  className?: string;
  variant?: "inline" | "modal";
}

export const HelpGuide = ({ className, variant = "modal" }: HelpGuideProps) => {
  const [showFullExample, setShowFullExample] = useState(false);

  const shortExample =
    "First I got a very high temperature, a dry cough, profound tiredness, and a runny nose. I found small white spots...";
  const longExample =
    "First I got a very high temperature, a dry cough, profound tiredness, and a runny nose. I found small white spots in my mouth. Yesterday, a rash began at my hairline and spread down my chest.";

  const isInline = variant === "inline";

  return (
    <div className={cn("mb-4 sm:mb-6", className)}>
      <h2
        className={cn(
          "mb-4 text-center",
          isInline
            ? "text-xs sm:text-sm font-semibold tracking-widest uppercase text-white/40"
            : "text-xl sm:text-2xl font-bold text-base-content"
        )}
      >
        How to Use
      </h2>

      <div className={cn("flex flex-col", isInline ? "gap-4" : "gap-3 sm:gap-4")}>
        {/* Step 1 */}
        <div
          className={cn(
            isInline
              ? "p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
              : "card bg-base-200/60 backdrop-blur border border-base-content/5 shadow-sm"
          )}
        >
          <div className={cn(isInline ? "" : "card-body p-4 sm:p-6 lg:p-8")}>
            <div className="flex items-start gap-3 sm:gap-4">
              <div
                className={cn(
                  "flex items-center justify-center shrink-0 font-bold",
                  isInline
                    ? "w-8 h-8 rounded-full bg-success/20 text-success text-sm"
                    : "badge badge-success badge-lg shadow-sm"
                )}
              >
                1
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <MessageSquare
                    className={cn(
                      "w-4 h-4 sm:w-5 sm:h-5",
                      isInline ? "text-success/80" : "text-success"
                    )}
                  />
                  <h3
                    className={cn(
                      "font-semibold",
                      isInline
                        ? "text-white/90 text-sm sm:text-base"
                        : "card-title text-base sm:text-lg text-base-content"
                    )}
                  >
                    Describe your symptoms
                  </h3>
                </div>
                <p
                  className={cn(
                    "mb-3 text-xs sm:text-sm",
                    isInline ? "text-white/60" : "text-base-content/80 text-sm sm:text-base"
                  )}
                >
                  Type in the box what you&apos;re feeling. The more detail, the
                  better!
                </p>
                <div
                  className={cn(
                    "p-3 sm:p-4 rounded-xl",
                    isInline
                      ? "bg-black/20 border border-white/5"
                      : "alert bg-success/10 border border-success/20 shadow-inner"
                  )}
                >
                  <div className="flex-1">
                    <div
                      className={cn(
                        "mb-2",
                        isInline
                          ? "text-[10px] uppercase tracking-wider font-semibold text-success/70"
                          : "badge badge-sm badge-success badge-outline border-success/30 bg-success/5"
                      )}
                    >
                      Example
                    </div>
                    <p
                      className={cn(
                        "text-xs sm:text-sm leading-relaxed",
                        isInline ? "text-white/70 italic" : "text-base-content/90"
                      )}
                    >
                      &quot;{showFullExample ? longExample : shortExample}&quot;
                    </p>
                    <button
                      onClick={() => setShowFullExample(!showFullExample)}
                      className={cn(
                        "mt-2 flex items-center gap-1 text-[10px] sm:text-xs font-medium transition-colors hover:opacity-100",
                        isInline
                          ? "text-white/40 hover:text-white/80"
                          : "btn btn-xs btn-ghost text-base-content/60"
                      )}
                    >
                      {showFullExample ? (
                        <>
                          Show less <ChevronUp className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          Show more <ChevronDown className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div
          className={cn(
            isInline
              ? "p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
              : "card bg-base-200/60 backdrop-blur border border-base-content/5 shadow-sm"
          )}
        >
          <div className={cn(isInline ? "" : "card-body p-4 sm:p-6 lg:p-8")}>
            <div className="flex items-start gap-3 sm:gap-4">
              <div
                className={cn(
                  "flex items-center justify-center shrink-0 font-bold",
                  isInline
                    ? "w-8 h-8 rounded-full bg-success/20 text-success text-sm"
                    : "badge badge-success badge-lg shadow-sm"
                )}
              >
                2
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <History
                    className={cn(
                      "w-4 h-4 sm:w-5 sm:h-5",
                      isInline ? "text-success/80" : "text-success"
                    )}
                  />
                  <h3
                    className={cn(
                      "font-semibold",
                      isInline
                        ? "text-white/90 text-sm sm:text-base"
                        : "card-title text-base sm:text-lg text-base-content"
                    )}
                  >
                    View your history
                  </h3>
                </div>
                <p
                  className={cn(
                    "text-xs sm:text-sm leading-relaxed",
                    isInline ? "text-white/60" : "text-base-content/80 text-sm sm:text-base"
                  )}
                >
                  Check past consultations anytime by going to the{" "}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md mx-0.5",
                      isInline
                        ? "bg-white/10 text-white/90 font-medium"
                        : "badge bg-success/10 border border-success/20 text-xs sm:text-sm px-2 text-base-content"
                    )}
                  >
                    <History className="w-3 h-3" />
                    History
                  </span>{" "}
                  tab in the sidebar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpGuide;
