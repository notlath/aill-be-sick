

import { getColor } from "@/utils/map-helpers";
import { Feature, GeoJsonObject } from "geojson";
import { Layer, LeafletMouseEvent, PathOptions } from "leaflet";
import { useRef } from "react";
import { GeoJSON, useMap } from "react-leaflet";
import useSelectedDiseaseStore from "@/stores/use-selected-disease-store";

interface ChoroplethLayerProps {
  geoData: GeoJsonObject;
  casesData: Record<string, number>;
}

export default function ChoroplethLayer({ geoData, casesData }: ChoroplethLayerProps) {
  const geoJsonRef = useRef<L.GeoJSON | null>(null);
  const map = useMap();
  const { selectedDisease } = useSelectedDiseaseStore();

  // Determine the style for each feature based on its case count
  function style(feature?: Feature): PathOptions {
    const name = feature?.properties?.name as string | undefined;
    const count = name ? (casesData[name] ?? 0) : 0;
    const isBoundary = !name;

    return {
      fillColor: isBoundary ? "transparent" : getColor(count, selectedDisease),
      weight: isBoundary ? 2 : 2,
      opacity: 1,
      color: isBoundary ? "#9CA3AF" : "white",
      dashArray: isBoundary ? "3" : "10",
      fillOpacity: isBoundary ? 0 : 0.7,
    };
  }

  // On hover (mirrors the Leaflet choropleth example)
  function highlightFeature(e: LeafletMouseEvent) {
    const layer = e.target;

    layer.setStyle({
      weight: 4,
      color: "#ffffff",
      dashArray: "",
      fillOpacity: 0.9,
    });
    layer.bringToFront();
  }

  // On hover out, reset style
  function resetHighlight(e: LeafletMouseEvent) {
    geoJsonRef.current?.resetStyle(e.target);
  }

  // On click, zoom to feature or pwedeng i-display yung patients belonging in that zone
  function zoomToFeature(e: LeafletMouseEvent) {
    map.fitBounds(e.target.getBounds());
  }

  // For each feature, bind a tooltip and hover events
  function onEachFeature(feature: Feature, layer: Layer) {
    const name = feature.properties?.name as string | undefined;
    const count = name ? (casesData[name] ?? 0) : 0;
    const isBoundary = !name;

    // If it's a boundary feature (like the main Barangay Bagong Silangan), make it non-interactive and skip tooltip/events
    if (isBoundary) {
      (layer as L.Path).options.interactive = false;
      return;
    }

    // Bind a tooltip showing zone name + case count
    (layer as L.Path).bindTooltip(
      `<strong>${name ?? "Unknown"}</strong><br/>${count} case${count !== 1 ? "s" : ""}`,
      { sticky: true }
    );

    // Add hover events
    layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
      click: zoomToFeature,
    });
  }

  return (
    <GeoJSON
      key={selectedDisease}
      data={geoData}
      style={style}
      onEachFeature={onEachFeature}
      ref={(ref) => {
        if (ref) geoJsonRef.current = ref;
      }}
    />
  );
}
