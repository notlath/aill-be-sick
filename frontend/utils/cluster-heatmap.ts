import chroma from "chroma-js";
import { buildClusterRamp } from "@/utils/cluster-colors";

export type ClusterLegendBin = {
  min: number;
  max?: number;
  color: string;
  label: string;
};

type ClusterLegendResult = {
  bins: ClusterLegendBin[];
  zeroColor: string;
};

const DEFAULT_BIN_COUNT = 5;

const formatRangeLabel = (min: number, max?: number) => {
  if (max == null || min === max) return `${min}`;
  return `${min}\u2013${max}`;
};

export const buildClusterLegendBins = (
  counts: number[],
  baseColor: string,
  steps: number = DEFAULT_BIN_COUNT,
): ClusterLegendResult => {
  const nonZero = counts.filter((value) => value > 0).sort((a, b) => a - b);
  const safeSteps = Math.max(3, steps);
  const ramp = buildClusterRamp(baseColor, safeSteps);
  const zeroColor = chroma.mix(ramp[0] ?? baseColor, "#ffffff", 0.65).hex();

  if (nonZero.length === 0) {
    return { bins: [], zeroColor };
  }

  const maxValue = nonZero[nonZero.length - 1] ?? 0;
  const thresholds = Array.from({ length: safeSteps }, (_, idx) => {
    const step = maxValue / safeSteps;
    return Math.round(idx * step);
  });

  thresholds.push(maxValue);

  const bins: ClusterLegendBin[] = [];
  for (let i = 0; i < safeSteps; i += 1) {
    let min = i === 0 ? 1 : thresholds[i] + 1;
    let max = i === safeSteps - 1 ? maxValue : thresholds[i + 1];

    if (min > max) {
      if (i === safeSteps - 1) {
        min = max;
      } else {
        continue;
      }
    }

    const color = ramp[i] ?? baseColor;
    bins.push({
      min,
      max,
      color,
      label: formatRangeLabel(min, max),
    });
  }

  const uniqueBins = bins.filter((bin, index, self) => 
    index === self.findIndex((b) => b.min === bin.min && b.max === bin.max)
  );

  return { bins: uniqueBins, zeroColor };
};

export const getClusterColorForCount = (
  count: number,
  bins: ClusterLegendBin[],
  zeroColor: string,
) => {
  if (count <= 0 || bins.length === 0) return zeroColor;
  const match = bins.find((bin) =>
    bin.max == null ? count >= bin.min : count >= bin.min && count <= bin.max,
  );
  return match?.color ?? bins[bins.length - 1]?.color ?? zeroColor;
};
