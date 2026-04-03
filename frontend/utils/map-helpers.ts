import chroma from "chroma-js";
import { DiseaseType } from "@/stores/use-selected-disease-store";

export const DISEASE_COLOR_SCALES: Record<DiseaseType, chroma.Scale> = {
  all: chroma.scale(["#EE9697", "#8C1719"]).mode("lab").domain([0, 100]),
  Dengue: chroma.scale(["#FCBA9C", "#8B2F04"]).mode("lab").domain([0, 100]),
  Pneumonia: chroma.scale(["#0088CC", "#004466"]).mode("lab").domain([0, 100]),
  Typhoid: chroma.scale(["#6CAFB2", "#234143"]).mode("lab").domain([0, 100]),
  Diarrhea: chroma.scale(["#FC9E73", "#8C2E03"]).mode("lab").domain([0, 100]),
  Measles: chroma.scale(["#FE72FB", "#650163"]).mode("lab").domain([0, 100]),
  Influenza: chroma.scale(["#4AC3D3", "#185A63"]).mode("lab").domain([0, 100]),
};

export function getDiseaseColorScale(disease: DiseaseType): chroma.Scale {
  return DISEASE_COLOR_SCALES[disease] || DISEASE_COLOR_SCALES.all;
}

export function getColor(count: number, disease: DiseaseType = 'all'): string {
  const scale = getDiseaseColorScale(disease);

  if (count <= 0) {
    return chroma.mix(scale(0).hex(), "#ffffff", 0.3).hex();
  }

  // Use the specific legend grades for a discrete color scale with thicker shades
  if (count >= 100) return scale(100).hex();
  if (count >= 50) return scale(75).hex();
  if (count >= 20) return scale(50).hex();
  if (count >= 10) return scale(25).hex();
  if (count >= 1) return scale(5).hex();

  return scale(0).hex(); // 0 cases
}
