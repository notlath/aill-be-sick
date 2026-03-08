"use client";

import { useMap } from "react-leaflet";
import { useEffect } from "react";
import { Diagnosis } from "@/lib/generated/prisma";

interface HeatmapLayerProps {
  diagnoses: Diagnosis[];
}

const HeatmapLayer = ({ diagnoses }: HeatmapLayerProps) => {
  const map = useMap();

  useEffect(() => {
    const L = require("leaflet");
    require("leaflet.heat");

    const points = diagnoses
      .filter((d) => d.latitude != null && d.longitude != null)
      .map((d) => [d.latitude!, d.longitude!, 1.0] as [number, number, number]);

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
