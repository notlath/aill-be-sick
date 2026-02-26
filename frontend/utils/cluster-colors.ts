import chroma from "chroma-js";

export const CLUSTER_BASE_COLORS = [
  "#2563eb", // blue
  "#059669", // emerald
  "#9333ea", // purple
  "#ea580c", // orange
  "#db2777", // pink
  "#4f46e5", // indigo
  "#0891b2", // cyan
  "#e11d48", // rose
];

export const getClusterBaseColor = (displayIndex: number): string => {
  if (CLUSTER_BASE_COLORS.length === 0) return "#6b7280";
  const safeIndex =
    ((displayIndex % CLUSTER_BASE_COLORS.length) + CLUSTER_BASE_COLORS.length) %
    CLUSTER_BASE_COLORS.length;
  return CLUSTER_BASE_COLORS[safeIndex];
};

export const buildClusterRamp = (
  baseColor: string,
  steps: number,
): string[] => {
  const safeSteps = Math.max(1, steps);
  try {
    return chroma
      .scale([
        chroma(baseColor).brighten(2).hex(),
        baseColor,
        chroma(baseColor).darken(2).hex(),
      ])
      .mode("lab")
      .colors(safeSteps);
  } catch (error) {
    console.warn("Falling back to neutral cluster ramp:", error);
    return chroma.scale(["#e5e7eb", "#111827"]).mode("lab").colors(safeSteps);
  }
};
