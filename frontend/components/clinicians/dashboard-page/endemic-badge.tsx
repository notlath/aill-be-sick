import * as React from "react";
import { MapPinned, TrendingUp } from "lucide-react";
import { cn } from "@/utils/lib";
import {
  getDiseaseByName,
  getDiseaseByValue,
  isInPeakSeason,
} from "@/constants/diseases";

interface EndemicBadgeProps {
  /** Disease name (e.g., "Dengue") or value (e.g., "DENGUE") */
  disease: string;
  /** Show peak season indicator when applicable */
  showPeakSeason?: boolean;
  /** Size variant */
  size?: "sm" | "md";
  /** Additional className */
  className?: string;
}

/**
 * Endemic Badge Component
 *
 * Displays a visual indicator for endemic diseases in the Philippines.
 * Shows "Endemic" label with optional "Peak Season" indicator when
 * the current month falls within the disease's peak season.
 */
const EndemicBadge: React.FC<EndemicBadgeProps> = ({
  disease,
  showPeakSeason = true,
  size = "sm",
  className,
}) => {
  // Look up disease metadata
  const diseaseData = getDiseaseByName(disease) || getDiseaseByValue(disease);

  if (!diseaseData || !diseaseData.endemic) {
    return null;
  }

  const inPeakSeason = showPeakSeason && isInPeakSeason(diseaseData);

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 gap-0.5",
    md: "text-xs px-2 py-1 gap-1",
  };

  const iconSizes = {
    sm: "size-2.5",
    md: "size-3",
  };

  // Build tooltip content
  const tooltipContent = [
    `${diseaseData.name} is endemic in the Philippines`,
    diseaseData.endemicDescription,
    inPeakSeason ? "Currently in peak season" : null,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <div className="tooltip tooltip-top" data-tip={tooltipContent}>
      <span
        className={cn(
          "inline-flex items-center font-medium rounded-full border transition-colors cursor-help",
          diseaseData.colorTheme.badge,
          sizeClasses[size],
          className
        )}
      >
        <MapPinned className={iconSizes[size]} />
        <span>Endemic</span>
        {inPeakSeason && (
          <>
            <span className="opacity-50">·</span>
            <TrendingUp className={cn(iconSizes[size], "text-warning")} />
            <span className="text-warning font-semibold">Peak</span>
          </>
        )}
      </span>
    </div>
  );
};

export default EndemicBadge;
