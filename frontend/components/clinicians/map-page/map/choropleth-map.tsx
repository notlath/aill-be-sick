"use client";

import { useId, useRef } from "react";
import type { GeoJsonObject } from "geojson";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import ChoroplethLayer from "./choropleth-layer";
import ChoroplethLegend from "./choropleth-legend";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { type FeatureCollection } from "geojson";
import { centerOfMass } from "@turf/turf";
import { Diagnosis } from "@/lib/generated/prisma";
import type { SurveillanceAnomaly } from "@/types";

// Hoist static primitives outside the component so they are never recreated on re-renders
const MAP_CENTER: [number, number] = [14.71, 121.113]; // Brgy. Bagong Silangan
const MAP_ZOOM = 14;
const MAP_STYLE = { height: "600px", width: "100%" };

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
      </MapContainer>
    </div>
  );
};

export default ChoroplethMap;
