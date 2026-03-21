"use client";

import { MessageSquare, History, ChevronDown, ChevronUp, Sparkles, Clock } from "lucide-react";
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

  if (isInline) {
    return (
      <div className={cn("w-full", className)}>
        {/* Compact inline guide for the main page */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          {/* Step 1 - Compact Card */}
          <div className="flex-1 group">
            <div className="card bg-base-100/80 backdrop-blur-sm border border-base-300/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-[border-color,box-shadow] duration-300">
              <div className="card-body p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary group-hover:from-primary/20 group-hover:to-primary/10 transition-colors duration-300">
                    <MessageSquare className="size-4" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-base-content mb-1">
                      Describe your symptoms
                    </h3>
                    <p className="text-xs text-base-content/60 leading-relaxed">
                      Share what you&apos;re experiencing in detail for better results
                    </p>
                  </div>
                </div>
                
                {/* Collapsible Example */}
                <div className="mt-3 pt-3 border-t border-base-300/50">
                  <button
                    onClick={() => setShowFullExample(!showFullExample)}
                    className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary font-medium transition-colors cursor-pointer rounded-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    aria-expanded={showFullExample}
                    aria-controls="help-example-content"
                  >
                    <Sparkles className="size-3" />
                    {showFullExample ? "Hide example" : "Show example"}
                    {showFullExample ? (
                      <ChevronUp className="size-3" />
                    ) : (
                      <ChevronDown className="size-3" />
                    )}
                  </button>
                  
                  <div
                    id="help-example-content"
                    className={cn(
                      "overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out",
                      showFullExample ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0 m-0"
                    )}
                  >
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-xs text-base-content/70 italic leading-relaxed">
                        &quot;{longExample}&quot;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 - Compact Card */}
          <div className="flex-1 group">
            <div className="card bg-base-100/80 backdrop-blur-sm border border-base-300/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-[border-color,box-shadow] duration-300">
              <div className="card-body p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary group-hover:from-primary/20 group-hover:to-primary/10 transition-colors duration-300">
                    <Clock className="size-4" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-base-content mb-1">
                      View your history
                    </h3>
                    <p className="text-xs text-base-content/60 leading-relaxed">
                      Access past consultations from the{" "}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-base-200 text-base-content/80 font-medium">
                        <History className="size-2.5" />
                        History
                      </span>{" "}
                      tab
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Modal variant - more detailed layout
  return (
    <div className={cn("mb-4 sm:mb-6", className)}>
      <h2 className="mb-6 text-center text-2xl sm:text-3xl font-bold text-base-content">
        How to Use
      </h2>

      <div className="flex flex-col gap-4">
        {/* Step 1 */}
        <div className="card bg-base-200/60 backdrop-blur border border-base-content/5 shadow-sm">
          <div className="card-body p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-success/20 to-success/5 text-success font-bold text-lg">
                1
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="size-5 text-success" />
                  <h3 className="card-title text-lg text-base-content">
                    Describe your symptoms
                  </h3>
                </div>
                <p className="text-base-content/70 mb-4">
                  Type in the box what you&apos;re feeling. The more detail, the
                  better!
                </p>
                <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                  <div className="badge badge-sm badge-success badge-outline mb-2">
                    Example
                  </div>
                  <p className="text-sm text-base-content/80 leading-relaxed">
                    &quot;{showFullExample ? longExample : shortExample}&quot;
                  </p>
                  <button
                    onClick={() => setShowFullExample(!showFullExample)}
                    className="btn btn-xs btn-ghost text-base-content/60 mt-2 gap-1"
                  >
                    {showFullExample ? (
                      <>
                        Show less <ChevronUp className="size-3" />
                      </>
                    ) : (
                      <>
                        Show more <ChevronDown className="size-3" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="card bg-base-200/60 backdrop-blur border border-base-content/5 shadow-sm">
          <div className="card-body p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-success/20 to-success/5 text-success font-bold text-lg">
                2
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <History className="size-5 text-success" />
                  <h3 className="card-title text-lg text-base-content">
                    View your history
                  </h3>
                </div>
                <p className="text-base-content/70">
                  Check past consultations anytime by going to the{" "}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/10 border border-success/20 text-base-content font-medium">
                    <History className="size-3" />
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
