import chroma from "chroma-js";
import { DiseaseType } from "@/stores/use-selected-disease-store";
import type { GeoJsonObject, FeatureCollection, Polygon, MultiPolygon } from "geojson";

export const DISEASE_COLOR_SCALES: Record<DiseaseType, chroma.Scale> = {
  all: chroma.scale(["#EE9697", "#8C1719"]).mode("lab").domain([0, 100]),
  Dengue: chroma.scale(["#FCBA9C", "#8B2F04"]).mode("lab").domain([0, 100]),
  Pneumonia: chroma.scale(["#0088CC", "#004466"]).mode("lab").domain([0, 100]),
  Typhoid: chroma.scale(["#6CAFB2", "#234143"]).mode("lab").domain([0, 100]),
  Impetigo: chroma.scale(["#BD9FE5", "#421F70"]).mode("lab").domain([0, 100]),
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

// ---------------------------------------------------------------------------
// Heatmap utilities
// ---------------------------------------------------------------------------

/**
 * Computes the arithmetic centroid (average of vertices) of a polygon's
 * outer ring. Coordinates are GeoJSON-style: [longitude, latitude].
 * Returns [latitude, longitude] (Leaflet convention).
 */
export function computePolygonCentroid(coords: number[][]): [number, number] {
  const lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
  const lng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
  return [lat, lng];
}

export type HeatPoint = {
  lat: number;
  lng: number;
  intensity: number;
  name: string;
};

/**
 * Builds the array of heat points used by HeatmapLayer.
 * One point per named GeoJSON zone, placed at the zone's polygon centroid,
 * with intensity equal to its case count. Zones with 0 cases are excluded
 * so the heatmap only glows where there are actual cases.
 */
export function computeHeatPoints(
  geoData: GeoJsonObject,
  casesData: Record<string, number>
): HeatPoint[] {
  if (geoData.type !== "FeatureCollection") return [];

  const fc = geoData as FeatureCollection;
  const points: HeatPoint[] = [];

  for (const feature of fc.features) {
    const name = feature.properties?.name as string | undefined;
    if (!name) continue;

    const intensity = casesData[name] ?? 0;
    if (intensity <= 0) continue;

    const geom = feature.geometry;
    let outerRing: number[][] | null = null;

    if (geom.type === "Polygon") {
      outerRing = (geom as Polygon).coordinates[0];
    } else if (geom.type === "MultiPolygon") {
      outerRing = (geom as MultiPolygon).coordinates[0][0];
    }

    if (!outerRing || outerRing.length === 0) continue;

    const [lat, lng] = computePolygonCentroid(outerRing);
    points.push({ lat, lng, intensity, name });
  }

  return points;
}

/**
 * Per-disease gradient stop objects for HeatmapLayer's `gradient` prop.
 * Keys are stop positions (0–1), values are CSS colour strings.
 */
export const DISEASE_HEATMAP_GRADIENTS: Record<DiseaseType, Record<string, string>> = {
  all:       { 0.2: "#EE9697", 0.6: "#C44547", 1.0: "#8C1719" },
  Dengue:    { 0.2: "#FCBA9C", 0.6: "#D97040", 1.0: "#8B2F04" },
  Pneumonia: { 0.2: "#66B8E8", 0.6: "#0088CC", 1.0: "#004466" },
  Typhoid:   { 0.2: "#6CAFB2", 0.6: "#3D8487", 1.0: "#234143" },
  Impetigo:  { 0.2: "#BD9FE5", 0.6: "#8A5EC8", 1.0: "#421F70" },
  Diarrhea:  { 0.2: "#FC9E73", 0.6: "#D96830", 1.0: "#8C2E03" },
  Measles:   { 0.2: "#FE72FB", 0.6: "#C930C6", 1.0: "#650163" },
  Influenza: { 0.2: "#4AC3D3", 0.6: "#26909E", 1.0: "#185A63" },
};
