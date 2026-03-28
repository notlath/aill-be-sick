import chroma from "chroma-js";

/**
 * Returns inline styles for token highlighting based on importance value (0-1 scale).
 * Uses chroma.js to create a smooth color scale from the Tailwind sky palette.
 *
 * @param importance - Importance value between 0 and 1
 * @param isDark - Whether dark mode is enabled
 * @returns Inline style object for background coloring
 */
export function getImportanceStyle(importance: number, isDark: boolean = false): React.CSSProperties {
  // Clamp importance to 0-1 range
  const clampedImportance = Math.max(0, Math.min(1, importance));

  if (isDark) {
    // Dark mode: sky colors optimized for dark backgrounds
    // Smooth scale from transparent to sky-300
    const darkScale = chroma
      .scale([
        "transparent",
        chroma("#0ea5e9").alpha(0.2), // sky-500 at low opacity
        chroma("#38bdf8").alpha(0.35), // sky-400 at medium opacity
        chroma("#7dd3fc").alpha(0.5),  // sky-300 at high opacity
      ])
      .mode("lab");

    const color = darkScale(clampedImportance);
    const backgroundColor = color.css();

    // Adjust text color based on importance for readability
    const textColor = clampedImportance >= 0.6 ? "rgb(255, 255, 255)" : "rgb(203, 213, 225)"; // slate-50 or slate-300
    const fontWeight = clampedImportance >= 0.7 ? "700" : clampedImportance >= 0.4 ? "600" : "500";

    return {
      backgroundColor,
      color: textColor,
      fontWeight,
      borderRadius: "0.25rem",
      padding: "0.25rem 0.375rem",
      border: clampedImportance >= 0.5 ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid rgba(148, 163, 184, 0.2)",
    };
  } else {
    // Light mode: sky blue gradient
    // Smooth scale from very light sky-100 to sky-500
    const lightScale = chroma
      .scale([
        chroma("#f0f9ff").alpha(0.3), // sky-50
        chroma("#e0f2fe").alpha(0.6), // sky-100
        chroma("#bae6fd").alpha(0.8), // sky-200
        chroma("#7dd3fc"),            // sky-300
        chroma("#38bdf8"),            // sky-400
        chroma("#0ea5e9"),            // sky-500
      ])
      .mode("lab");

    const color = lightScale(clampedImportance);
    const backgroundColor = color.css();

    // Always use black text for light mode
    const textColor = "rgb(15, 23, 42)"; // slate-900
    const fontWeight = clampedImportance >= 0.7 ? "700" : clampedImportance >= 0.4 ? "600" : "500";

    return {
      backgroundColor,
      color: textColor,
      fontWeight,
      borderRadius: "0.25rem",
      padding: "0.25rem 0.375rem",
      border: clampedImportance >= 0.5 ? "1px solid rgba(14, 165, 233, 0.3)" : "1px solid rgba(148, 163, 184, 0.3)",
    };
  }
}

/**
 * Returns the raw chroma color value for custom styling.
 *
 * @param importance - Importance value between 0 and 1
 * @param isDark - Whether dark mode is enabled
 * @returns CSS color string (rgba/hex)
 */
export function getImportanceColorValue(importance: number, isDark: boolean = false): string {
  const clampedImportance = Math.max(0, Math.min(1, importance));

  if (isDark) {
    const darkScale = chroma
      .scale([
        "transparent",
        chroma("#0ea5e9").alpha(0.2),
        chroma("#38bdf8").alpha(0.35),
        chroma("#7dd3fc").alpha(0.5),
      ])
      .mode("lab");

    return darkScale(clampedImportance).css();
  } else {
    const lightScale = chroma
      .scale([
        chroma("#f0f9ff").alpha(0.3),
        chroma("#e0f2fe").alpha(0.6),
        chroma("#bae6fd").alpha(0.8),
        chroma("#7dd3fc"),
        chroma("#38bdf8"),
        chroma("#0ea5e9"),
      ])
      .mode("lab");

    return lightScale(clampedImportance).css();
  }
}
