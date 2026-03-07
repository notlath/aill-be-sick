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

const quantile = (values: number[], q: number) => {
  if (values.length === 0) return 0;
  const pos = (values.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (values[base + 1] !== undefined) {
    return values[base] + rest * (values[base + 1] - values[base]);
  }
  return values[base];
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

  const thresholds = Array.from({ length: safeSteps }, (_, idx) => {
    const q = idx / safeSteps;
    return Math.round(quantile(nonZero, q));
  });

  thresholds.push(Math.round(nonZero[nonZero.length - 1]));

  const bins: ClusterLegendBin[] = [];
  for (let i = 0; i < safeSteps; i += 1) {
    const min = thresholds[i];
    const max = thresholds[i + 1];
    if (min === 0 && max === 0) {
      continue;
    }
    const color = ramp[i] ?? baseColor;
    bins.push({
      min,
      max: i === safeSteps - 1 ? undefined : max,
      color,
      label: formatRangeLabel(min, i === safeSteps - 1 ? undefined : max),
    });
  }

  return { bins, zeroColor };
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
