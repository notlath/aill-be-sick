"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { GeoJsonObject } from "geojson";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import ChoroplethLayer from "./choropleth-layer";
import ChoroplethLegend from "./choropleth-legend";
import L from "leaflet";
import { BAGONG_SILANGAN_DISTRICTS } from "@/constants/bagong-silangan-districts";
import type { Diagnosis } from "@/lib/generated/prisma";

// Hoist static primitives outside the component so they are never recreated on re-renders
const MAP_CENTER: [number, number] = [14.71, 121.113]; // Brgy. Bagong Silangan
const MAP_ZOOM = 14;
const MAP_STYLE = { height: "600px", width: "100%" };

function MapCenterUpdater() {
  const searchParams = useSearchParams();
  const map = useMap();

  useEffect(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    if (lat && lng) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        map.flyTo([parsedLat, parsedLng], 16, { animate: true, duration: 1.5 });
      }
    }
  }, [searchParams, map]);

  return null;
}

type ChoroplethMapProps = {
  casesData: Record<string, number>;
  geoData: GeoJsonObject;
  diagnoses: Diagnosis[];
  onFeatureClick?: (featureName: string) => void;
};

const ChoroplethMap = ({ casesData, geoData, diagnoses, onFeatureClick }: ChoroplethMapProps) => {
  // Generate a unique, stable key per mount cycle so each navigation produces
  // a fresh MapContainer and avoids the "container is being reused" error.
  // We use useState with an initializer to ensure it's generated once per mount.
  const [mapKey] = useState(() => `choropleth-map-${Math.random().toString(36).substring(2, 9)}`);
  const searchParams = useSearchParams();

  // Custom icon for targeted outbreak (GPS Pin)
  const targetIcon = L.divIcon({
    className: "bg-transparent border-none",
    html: `<div class="relative flex items-center justify-center">
            <div class="bg-primary rounded-full p-1.5 shadow-lg border-2 border-base-100 ring-4 ring-primary/20 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div class="absolute -bottom-1 w-2 h-2 bg-primary rotate-45 border-r-2 border-b-2 border-base-100 ring-2 ring-primary/20"></div>
          </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  const targetLat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : null;
  const targetLng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : null;
  const targetDisease = searchParams.get("disease");
  const hasTarget = targetLat !== null && targetLng !== null && !isNaN(targetLat) && !isNaN(targetLng);

  // Find the district name from centroid if we have a target
  const targetDistrict = hasTarget 
    ? BAGONG_SILANGAN_DISTRICTS.find(d => 
        d.centroid && 
        Math.abs(d.centroid.lat - targetLat) < 0.0001 && 
        Math.abs(d.centroid.lng - targetLng) < 0.0001
      )?.name 
    : null;

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
          className="map-tiles"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCenterUpdater />
        <ChoroplethLayer
          casesData={casesData}
          geoData={geoData}
          diagnoses={diagnoses}
          onFeatureClick={onFeatureClick}
        />
        <ChoroplethLegend />

        {/* Render the targeted outbreak from URL if present */}
        {hasTarget && (
          <Marker position={[targetLat, targetLng]} icon={targetIcon}>
            <Tooltip className="bg-base-100 border-none shadow-xl rounded-lg text-base-content p-3" opacity={1} direction="top" offset={[0, -10]}>
              <div className="font-semibold">{targetDistrict || "Target Outbreak"}</div>
              <div className="text-sm text-base-content/70 mt-1">
                Total cases: <span className="font-bold text-primary">{targetDistrict ? (casesData[targetDistrict] || 0) : 0}</span>
              </div>
              <div className="text-xs opacity-60 mt-1">
                Disease: {targetDisease || "N/A"}
              </div>
            </Tooltip>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default ChoroplethMap;
