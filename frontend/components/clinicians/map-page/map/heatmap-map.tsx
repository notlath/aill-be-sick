"use client";

import { useId, useMemo, useRef } from "react";
import type { GeoJsonObject } from "geojson";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Diagnosis } from "@/lib/generated/prisma";
import { computeHeatPoints, HeatPoint } from "@/utils/map-helpers";
import HeatmapLayer from "./heatmap-layer";
import HeatmapLegend from "./heatmap-legend";
import HeatmapBoundaryLayer from "./heatmap-boundary-layer";

const MAP_CENTER: [number, number] = [14.71, 121.113];
const MAP_ZOOM = 14;
const MAP_STYLE = { height: "600px", width: "100%" };

type HeatmapMapProps = {
  casesData: Record<string, number>;
  geoData: GeoJsonObject;
  diagnoses: Diagnosis[];
  onFeatureClick?: (featureName: string) => void;
};

const HeatmapMap = ({ casesData, geoData, onFeatureClick }: HeatmapMapProps) => {
  const id = useId();
  const mountRef = useRef(0);
  mountRef.current += 1;
  const mapKey = `${id}-${mountRef.current}`;

  const heatPoints: HeatPoint[] = useMemo(
    () => computeHeatPoints(geoData, casesData),
    [geoData, casesData]
  );

  return (
    <div className="rounded-xl overflow-hidden">
      <MapContainer
        key={mapKey}
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        style={MAP_STYLE}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {heatPoints.length > 0 && (
          <HeatmapLayer
            points={heatPoints}
            radius={50}
            blur={30}
            minOpacity={0.3}
          />
        )}
        <HeatmapBoundaryLayer
          geoData={geoData}
          casesData={casesData}
          onFeatureClick={onFeatureClick}
        />
        <HeatmapLegend />
      </MapContainer>
    </div>
  );
};

export default HeatmapMap;
