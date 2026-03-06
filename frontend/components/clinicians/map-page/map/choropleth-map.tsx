"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { GeoJsonObject } from "geojson";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import ChoroplethLayer from "./choropleth-layer";
import ChoroplethLegend from "./choropleth-legend";

// Hoist static primitives outside the component so they are never recreated on re-renders
const MAP_CENTER: [number, number] = [14.71, 121.113]; // Brgy. Bagong Silangan
const MAP_ZOOM = 14;
const MAP_STYLE = { height: "600px", width: "100%" };

type ChoroplethMapProps = {
  casesData: Record<string, number>;
};

const ChoroplethMap = ({ casesData }: ChoroplethMapProps) => {
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate a unique, stable key per mount cycle so each navigation produces
  // a fresh MapContainer and avoids the "container is being reused" error.
  const id = useId();
  const mountRef = useRef(0);

  mountRef.current += 1;
  
  const mapKey = `${id}-${mountRef.current}`;

  // Fetch the GeoJSON from /public. Error is captured so the loading state
  // doesn't hang silently on network failure.
  useEffect(() => {
    fetch("/geojson/bagong_silangan.geojson")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load GeoJSON: ${res.status}`);
        return res.json();
      })
      .then((data: GeoJsonObject) => setGeoData(data))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Unknown error")
      );
  }, []);

  // Render an error boundary fallback (papalitan ng DaisyUI skeleton maya)
  if (error) {
    return (
      <div className="rounded-xl overflow-hidden" aria-label="Map error">
        {error}
      </div>
    );
  }

  if (!geoData) {
    return (
      <div className="rounded-xl overflow-hidden" aria-label="Loading map">
        <div className="skeleton h-[600px] w-full" />
      </div>
    );
  }

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
        <ChoroplethLayer casesData={casesData} geoData={geoData} />
        <ChoroplethLegend />
      </MapContainer>
    </div>
  );
};

export default ChoroplethMap;
