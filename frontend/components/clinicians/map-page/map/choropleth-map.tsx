"use client";

import { useId, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { GeoJsonObject } from "geojson";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import ChoroplethLayer from "./choropleth-layer";
import ChoroplethLegend from "./choropleth-legend";
import L from "leaflet";
import { type FeatureCollection } from "geojson";
import { centerOfMass } from "@turf/turf";
import { Diagnosis } from "@/lib/generated/prisma";
import type { SurveillanceAnomaly } from "@/types";
import { BAGONG_SILANGAN_DISTRICTS } from "@/constants/bagong-silangan-districts";

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
  topAnomalies?: SurveillanceAnomaly[];
  onFeatureClick?: (featureName: string) => void;
};

const ChoroplethMap = ({ casesData, geoData, diagnoses, topAnomalies = [], onFeatureClick }: ChoroplethMapProps) => {
  // Generate a unique, stable key per mount cycle so each navigation produces
  // a fresh MapContainer and avoids the "container is being reused" error.
  const id = useId();
  const mountRef = useRef(0);

  mountRef.current += 1;

  const mapKey = `${id}-${mountRef.current}`;
  const searchParams = useSearchParams();

  // Group top anomalies by district
  const anomaliesByDistrict = topAnomalies.reduce((acc, anomaly) => {
    if (anomaly.district) {
      if (!acc[anomaly.district]) acc[anomaly.district] = [];
      acc[anomaly.district].push(anomaly);
    }
    return acc;
  }, {} as Record<string, SurveillanceAnomaly[]>);

  // Custom icon for critical anomalies
  const criticalIcon = L.divIcon({
    className: "bg-transparent border-none",
    html: `<div class="relative flex h-6 w-6">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
            <span class="relative inline-flex rounded-full h-6 w-6 bg-error shadow-lg shadow-error/50 border-2 border-base-100 flex items-center justify-center text-error-content text-[10px] font-bold">!</span>
          </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

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
        
        {/* Render markers for critical district anomalies */}
        {Object.entries(anomaliesByDistrict).map(([district, districtAnomalies]) => {
          // Find the feature for this district
          const featureCollection = geoData as FeatureCollection;
          if (featureCollection.type !== "FeatureCollection") return null;
          
          const districtFeature = featureCollection.features.find(
             f => f.properties?.name === district
          );
          
          if (!districtFeature) return null;
          
          try {
             // Calculate visual center of district polygon
             const center = centerOfMass(districtFeature);
             const [lng, lat] = center.geometry.coordinates;
             
             // Skip if this is the exact target coordinate
             if (hasTarget && Math.abs(lat - targetLat) < 0.0001 && Math.abs(lng - targetLng) < 0.0001) return null;

             return (
                <Marker 
                  key={`district-anomaly-group-${district}`} 
                  position={[lat, lng]}
                  icon={criticalIcon}
                >
                  <Tooltip className="bg-base-100 border-none shadow-xl rounded-lg text-base-content p-3" opacity={1} direction="top" offset={[0, -10]}>
                    <div className="font-semibold border-b pb-1 mb-2">{district} ({districtAnomalies.length} Critical Case{districtAnomalies.length !== 1 ? 's' : ''})</div>
                    <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
                       {districtAnomalies.map((anomaly, idx) => (
                           <div key={idx} className="text-sm">
                               <div className="font-medium text-base-content/90">{anomaly.user?.name || `Patient ID: ${anomaly.userId?.toString().slice(-6).toUpperCase()}`}</div>
                               <div className="flex justify-between items-center gap-4 mt-0.5">
                                   <span className="text-xs opacity-70 truncate max-w-[120px]" title={anomaly.disease}>{anomaly.disease}</span>
                                   <span className="text-xs text-error font-medium">Score: {anomaly.anomaly_score.toFixed(3)}</span>
                               </div>
                           </div>
                       ))}
                    </div>
                  </Tooltip>
                </Marker>
             );
          } catch (e) {
             // In case geometry is invalid for turf
             console.error("Failed to compute center for anomaly district:", e);
             return null;
          }
        })}

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
