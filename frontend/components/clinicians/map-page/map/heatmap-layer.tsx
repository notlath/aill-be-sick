"use client";

import { useMap } from "react-leaflet";
import { useEffect } from "react";
interface GeoPoint {
  latitude: number | null;
  longitude: number | null;
}

interface HeatmapLayerProps {
  diagnoses: GeoPoint[];
}

const HeatmapLayer = ({ diagnoses }: HeatmapLayerProps) => {
  const map = useMap();

  useEffect(() => {
    const L = require("leaflet");
    require("leaflet.heat");

    const points = diagnoses
      .filter((d) => d.latitude != null && d.longitude != null)
      .map((d) => [Number(d.latitude), Number(d.longitude), 1.0] as [number, number, number])
      .filter((p) => !isNaN(p[0]) && !isNaN(p[1]) && (p[0] !== 0 || p[1] !== 0));

    const heat = (L as any)
      .heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
      })
      .addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, diagnoses]);

  return null;
};

export default HeatmapLayer;
