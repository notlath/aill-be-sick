import { Feature, GeoJsonObject } from "geojson";
import { Layer, LeafletMouseEvent, PathOptions } from "leaflet";
import { useRef } from "react";
import { useMap, GeoJSON } from "react-leaflet";

interface HeatmapBoundaryLayerProps {
  geoData: GeoJsonObject;
  casesData: Record<string, number>;
  onFeatureClick?: (featureName: string) => void;
}

const HeatmapBoundaryLayer = ({ geoData, casesData, onFeatureClick }: HeatmapBoundaryLayerProps) => {
  const geoJsonRef = useRef<L.GeoJSON | null>(null);
  const map = useMap();

  function style(feature?: Feature): PathOptions {
    const name = feature?.properties?.name as string | undefined;
    const isBoundary = !name;

    return {
      fillColor: "transparent",
      fillOpacity: 0,
      weight: isBoundary ? 2 : 1.5,
      opacity: isBoundary ? 0.5 : 0.7,
      color: isBoundary ? "#9CA3AF" : "#6B7280",
      dashArray: isBoundary ? "4" : undefined,
    };
  }

  function highlightFeature(e: LeafletMouseEvent) {
    const layer = e.target;
    layer.setStyle({ weight: 3, color: "#374151", opacity: 1 });
    layer.bringToFront();
  }

  function resetHighlight(e: LeafletMouseEvent) {
    geoJsonRef.current?.resetStyle(e.target);
  }

  function handleClick(e: LeafletMouseEvent) {
    const layer = e.target;
    const name = layer.feature?.properties?.name as string | undefined;
    if (name && onFeatureClick) {
      onFeatureClick(name);
    }
    map.fitBounds(e.target.getBounds());
  }

  function onEachFeature(feature: Feature, layer: Layer) {
    const name = feature.properties?.name as string | undefined;
    const count = name ? (casesData[name] ?? 0) : 0;
    const isBoundary = !name;

    if (isBoundary) {
      (layer as L.Path).options.interactive = false;
      return;
    }

    (layer as L.Path).bindTooltip(
      `<strong>${name}</strong><br/>${count} case${count !== 1 ? "s" : ""}`,
      { sticky: true }
    );

    layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
      click: handleClick,
    });
  }

  return (
    <GeoJSON
      key={JSON.stringify(casesData)}
      data={geoData}
      style={style}
      onEachFeature={onEachFeature}
      ref={(ref) => {
        if (ref) geoJsonRef.current = ref;
      }}
    />
  );
};

export default HeatmapBoundaryLayer