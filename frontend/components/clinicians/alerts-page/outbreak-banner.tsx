import { OctagonAlert } from "lucide-react";
import React from "react";

interface OutbreakBannerProps {
  anomalyCount: number;
  totalAnalyzed: number;
}

const OutbreakBanner: React.FC<OutbreakBannerProps> = ({
  anomalyCount,
  totalAnalyzed,
}) => {
  const percentage = totalAnalyzed > 0
    ? ((anomalyCount / totalAnalyzed) * 100).toFixed(1)
    : "0";

  return (
    <div className="card border-error/30 bg-gradient-to-r from-error/10 via-error/5 to-transparent border">
      <div className="card-body flex-row items-center gap-5 py-5">
        <div className="bg-error/15 animate-pulse-slow rounded-2xl p-4">
          <OctagonAlert className="text-error size-8" />
        </div>
        <div className="flex-1">
          <h2 className="text-error text-xl font-semibold tracking-tight">
            Outbreak Alert Triggered
          </h2>
          <p className="text-error/70 mt-1 text-sm">
            <span className="font-semibold">{anomalyCount} anomalies</span>{" "}
            detected across {totalAnalyzed.toLocaleString()} diagnoses ({percentage}%)
            — exceeding the expected threshold. Immediate review is recommended.
          </p>
        </div>
        <div className="text-error/60 text-right">
          <div className="text-error text-4xl font-bold tabular-nums">
            {anomalyCount}
          </div>
          <div className="text-xs font-medium">anomalies</div>
        </div>
      </div>
    </div>
  );
};

export default OutbreakBanner;
