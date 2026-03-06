import chroma from "chroma-js";
import { DiseaseType } from "@/stores/use-selected-disease-store";

export const DISEASE_COLOR_SCALES: Record<DiseaseType, chroma.Scale> = {
  all: chroma.scale(["#EE9697", "#D32225"]).mode("lab").domain([0, 100]),
  Dengue: chroma.scale(["#FCBA9C", "#C64306"]).mode("lab").domain([0, 100]),
  Pneumonia: chroma.scale(["#0088CC", "#00527a"]).mode("lab").domain([0, 100]),
  Typhoid: chroma.scale(["#6CAFB2", "#2A4E50"]).mode("lab").domain([0, 100]),
  Impetigo: chroma.scale(["#BD9FE5", "#54278f"]).mode("lab").domain([0, 100]),
  Diarrhea: chroma.scale(["#FC9E73", "#C84204"]).mode("lab").domain([0, 100]),
  Measles: chroma.scale(["#FE72FB", "#7a0177"]).mode("lab").domain([0, 100]),
  Influenza: chroma.scale(["#4AC3D3", "#1C6973"]).mode("lab").domain([0, 100]),
};

export function getDiseaseColorScale(disease: DiseaseType): chroma.Scale {
  return DISEASE_COLOR_SCALES[disease] || DISEASE_COLOR_SCALES.all;
}

export function getColor(count: number, disease: DiseaseType = 'all'): string {
  const scale = getDiseaseColorScale(disease);

  if (count <= 0) {
    return chroma.mix(scale(0).hex(), "#ffffff", 0.5).hex();
  }

  // Use the specific legend grades for a discrete color scale
  if (count >= 100) return scale(100).hex();
  if (count >= 50) return scale(50).hex();
  if (count >= 20) return scale(20).hex();
  if (count >= 10) return scale(10).hex();
  
  return scale(1).hex(); // 1 to 9 cases
}
