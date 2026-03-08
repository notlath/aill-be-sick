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
  return `${min}–${max}`;
};

export const buildClusterLegendBins = (
  counts: number[],
  baseColor: string,
  steps: number = DEFAULT_BIN_COUNT,
): ClusterLegendResult => {
  const safeSteps = Math.max(3, steps);
  const ramp = buildClusterRamp(baseColor, safeSteps);
  const zeroColor = chroma.mix(ramp[0] ?? baseColor, "#ffffff", 0.65).hex();

  const nonZero = counts.filter((value) => value > 0);

  if (nonZero.length === 0) {
    return { bins: [], zeroColor };
  }

  const maxValue = Math.max(...nonZero);
  const stepSize = Math.ceil(maxValue / safeSteps);

  const bins: ClusterLegendBin[] = [];
  for (let i = 0; i < safeSteps; i += 1) {
    const min = i === 0 ? 1 : i * stepSize + 1;
    const max = i === safeSteps - 1 ? maxValue : (i + 1) * stepSize;

    if (min > max) continue;

    const color = ramp[i] ?? baseColor;
    bins.push({
      min,
      max,
      color,
      label: formatRangeLabel(min, max),
    });
  }

  const seen = new Set<string>();
  const uniqueBins = bins.filter((bin) => {
    const key = `${bin.min}-${bin.max}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

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
