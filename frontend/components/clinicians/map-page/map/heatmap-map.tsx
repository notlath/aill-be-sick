"use client";

import { useId, useRef } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import HeatmapLayer from "./heatmap-layer";
import { Diagnosis } from "@/lib/generated/prisma";

const MAP_CENTER: [number, number] = [14.71, 121.113]; // Brgy. Bagong Silangan
const MAP_ZOOM = 14;
const MAP_STYLE = { height: "600px", width: "100%" };

type HeatmapMapProps = {
  diagnoses: Diagnosis[];
};

const HeatmapMap = ({ diagnoses }: HeatmapMapProps) => {
  const id = useId();
  const mountRef = useRef(0);
  mountRef.current += 1;
  const mapKey = `${id}-${mountRef.current}`;

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
        <HeatmapLayer diagnoses={diagnoses} />
      </MapContainer>
    </div>
  );
};

export default HeatmapMap;
