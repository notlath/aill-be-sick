"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

const IllnessPatternsExplainer = () => {
  const [showDetails, setShowDetails] = useState(false);
  const detailsId = "illness-patterns-details";

  return (
    <div className="max-w-3xl">
      <p className="text-base-content/70 text-sm">
        View patients grouped by similar symptoms and diagnoses.
      </p>

      <div
        id={detailsId}
        aria-hidden={!showDetails}
        className={`grid overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          showDetails
            ? "mt-3 grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <p className="text-base-content/60 text-sm pl-4 border-l-2 border-base-content/20 min-h-0">
          Regular filters are still useful when you already know what to look
          for. This grouping view helps with the opposite: finding hidden
          patterns across many symptoms at once. It can surface early outbreak
          signals or unusual case mixes that are harder to spot when reviewing
          patients one by one.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setShowDetails((prev) => !prev)}
        aria-expanded={showDetails}
        aria-controls={detailsId}
        className="btn btn-ghost btn-xs mt-2.5 gap-1 bg-base-200 hover:bg-base-300 font-normal"
      >
        <span>{showDetails ? "Show less" : "Why not regular filters?"}</span>
        <ChevronDown
          className={`size-3 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            showDetails ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>
    </div>
  );
};

export default IllnessPatternsExplainer;
