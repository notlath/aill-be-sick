import { Feature, GeoJsonObject } from "geojson";
import { Layer, LeafletMouseEvent, PathOptions } from "leaflet";
import { useRef } from "react";
import { GeoJSON, useMap } from "react-leaflet";
import type { IllnessRecord } from "@/types";
import {
  getClusterColorForCount,
  type ClusterLegendBin,
} from "@/utils/cluster-heatmap";

interface ClusterChoroplethLayerProps {
  geoData: GeoJsonObject;
  casesData: Record<string, number>;
  illnesses: IllnessRecord[];
  legendBins: ClusterLegendBin[];
  zeroColor: string;
  selectedGroupLabel: string;
  onFeatureClick?: (featureName: string) => void;
}

export default function ClusterChoroplethLayer({
  geoData,
  casesData,
  illnesses,
  legendBins,
  zeroColor,
  selectedGroupLabel,
  onFeatureClick,
}: ClusterChoroplethLayerProps) {
  const geoJsonRef = useRef<L.GeoJSON | null>(null);
  const map = useMap();

  void illnesses;

  function style(feature?: Feature): PathOptions {
    const name = feature?.properties?.name as string | undefined;
    const count = name ? (casesData[name] ?? 0) : 0;
    const isBoundary = !name;

    return {
      fillColor: isBoundary
        ? "transparent"
        : getClusterColorForCount(count, legendBins, zeroColor),
      weight: isBoundary ? 2 : 2,
      opacity: 1,
      color: isBoundary ? "#9CA3AF" : "white",
      dashArray: isBoundary ? "3" : "10",
      fillOpacity: isBoundary ? 0 : 0.7,
    };
  }

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

  function resetHighlight(e: LeafletMouseEvent) {
    geoJsonRef.current?.resetStyle(e.target);
  }

  function zoomToFeature(e: LeafletMouseEvent) {
    const layer = e.target;
    const name = layer.feature?.properties?.name;

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
      `<strong>${name ?? "Unknown"}</strong><br/>${count} illness${count !== 1 ? "es" : ""} in Group ${selectedGroupLabel}`,
      { sticky: true },
    );

    layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
      click: zoomToFeature,
    });
  }

  return (
    <GeoJSON
      key={selectedGroupLabel}
      data={geoData}
      style={style}
      onEachFeature={onEachFeature}
      ref={(ref) => {
        if (ref) geoJsonRef.current = ref;
      }}
    />
  );
}
