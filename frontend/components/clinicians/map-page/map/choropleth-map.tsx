"use client";

import { useId, useRef } from "react";
import type { GeoJsonObject } from "geojson";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import ChoroplethLayer from "./choropleth-layer";
import ChoroplethLegend from "./choropleth-legend";
import { Diagnosis } from "@/lib/generated/prisma";

// Hoist static primitives outside the component so they are never recreated on re-renders
const MAP_CENTER: [number, number] = [14.71, 121.113]; // Brgy. Bagong Silangan
const MAP_ZOOM = 14;
const MAP_STYLE = { height: "600px", width: "100%" };

type ChoroplethMapProps = {
  casesData: Record<string, number>;
  geoData: GeoJsonObject;
  diagnoses: Diagnosis[];
};

const ChoroplethMap = ({ casesData, geoData, diagnoses }: ChoroplethMapProps) => {
  // Generate a unique, stable key per mount cycle so each navigation produces
  // a fresh MapContainer and avoids the "container is being reused" error.
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
        <ChoroplethLayer casesData={casesData} geoData={geoData} diagnoses={diagnoses} />
        <ChoroplethLegend />
      </MapContainer>
    </div>
  );
};

export default ChoroplethMap;
