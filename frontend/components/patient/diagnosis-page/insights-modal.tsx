import { useMemo } from "react";

type InsightsModalProps = {
  tokens?: string[];
  importances?: number[];
};

const normalize = (values: number[]): number[] => {
  const min = Math.min(...values);
  const max = Math.max(...values);

  return values.map((v) => (v - min) / (max - min || 1));
};

const InsightsModal = ({
  tokens = [],
  importances = [],
}: InsightsModalProps) => {
  const normalizedImportances = useMemo(() => {
    return normalize(importances);
  }, [importances]);
  const linkedTokens = useMemo(() => {
    return tokens.map((token, idx) => ({
      token,
      importance: normalizedImportances[idx],
    }));
  }, [normalizedImportances, tokens]);

  return (
    <dialog id="insights_modal" className="modal">
      <div className="max-w-2xl modal-box">
        <form method="dialog">
          <button className="top-2 right-2 absolute btn btn-sm btn-circle btn-ghost">
            ✕
          </button>
        </form>
        <h3 className="font-bold text-lg">Diagnosis insights</h3>
        <p className="py-4 text-muted">
          Here's a heatmap of your symptoms. Symptoms highlighted in deeper red
          indicate higher importance, and thus a stronger influence on the
          diagnosis.
        </p>
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
              key={t.token + t.importance}
              style={{
                backgroundColor: `rgba(255, 0, 0, ${t.importance})`, // red intensity
                borderRadius: "4px",
                padding: "2px 4px",
                // remove horizontal-only spacing (we use gap on the container)
                marginRight: 0,
                marginBottom: "4px",
                transition: "background-color 0.2s ease",
                cursor: "default",
                // allow long/unbroken tokens to break
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
              title={`Importance: ${importances[i].toFixed(4)}`}
            >
              {t.token}
            </span>
          ))}
        </div>
      </div>
    </dialog>
  );
};

export default InsightsModal;
