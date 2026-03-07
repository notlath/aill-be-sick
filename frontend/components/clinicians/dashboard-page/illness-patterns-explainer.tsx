"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const IllnessPatternsExplainer = () => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="max-w-3xl">
      <p className="text-base-content/70 text-sm">
        View patients grouped by similar symptoms and diagnoses.
      </p>

      {showDetails ? (
        <p className="text-base-content/60 text-sm mt-3 pl-4 border-l-2 border-base-content/20">
          Regular filters are still useful when you already know what to look
          for. This grouping view helps with the opposite: finding hidden
          patterns across many symptoms at once. It can surface early outbreak
          signals or unusual case mixes that are harder to spot when reviewing
          patients one by one.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setShowDetails((prev) => !prev)}
        className="btn btn-ghost btn-xs mt-2 gap-1"
      >
        {showDetails ? (
          <>
            Show less <ChevronUp className="size-3" />
          </>
        ) : (
          <>
            Why not regular filters? <ChevronDown className="size-3" />
          </>
        )}
      </button>
    </div>
  );
};

export default IllnessPatternsExplainer;
