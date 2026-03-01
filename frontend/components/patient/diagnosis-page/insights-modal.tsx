"use client";

import { XIcon } from "lucide-react";
import { useMemo } from "react";

type InsightsModalProps = {
  id: string;
  tokens?: string[];
  importances?: number[];
};

const normalize = (values: number[]): number[] => {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);

  return values.map((v) => (v - min) / (max - min || 1));
};

const InsightsModal = ({
  id,
  tokens = [],
  importances = [],
}: InsightsModalProps) => {
  const normalizedImportances = useMemo(() => {
    return normalize(importances);
  }, [importances]);

  const linkedTokens = useMemo(() => {
    return tokens.map((token, idx) => ({
      token,
      importance: normalizedImportances[idx] ?? 0,
    }));
  }, [normalizedImportances, tokens]);

  return (
    <dialog id={id} className="modal">
      <div className="modal-box max-w-2xl">
        <form method="dialog">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
            <XIcon className="size-4" />
          </button>
        </form>
        <h3 className="font-bold text-xl">Diagnosis insights</h3>
        <p className="py-4 text-muted text-sm">
          Here's a heatmap of your symptoms. Symptoms highlighted in deeper red
          indicate higher importance, and thus a stronger influence on the
          diagnosis.
        </p>

        {linkedTokens.length === 0 ? (
          <div className="alert alert-warning">
            <span>No explanation available for this diagnosis yet.</span>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              alignItems: "center",
              whiteSpace: "normal",
            }}
          >
            {linkedTokens.map((t, i) => (
              <span
                key={`${t.token}-${i}`}
                style={{
                  backgroundColor: `rgba(255, 0, 0, ${t.importance})`,
                  borderRadius: "4px",
                  padding: "2px 4px",
                  marginRight: 0,
                  marginBottom: "4px",
                  transition: "background-color 0.2s ease",
                  cursor: "default",
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
                title={`Importance: ${importances[i]?.toFixed(4) ?? "0.0000"}`}
                className="text-base"
              >
                {t.token}
              </span>
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
};

export default InsightsModal;
