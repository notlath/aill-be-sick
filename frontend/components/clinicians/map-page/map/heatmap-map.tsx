"use client";

import { useId, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import HeatmapLayer from "./heatmap-layer";
import L from "leaflet";
import type { SurveillanceAnomaly } from "@/types";
import { getReasonLabel } from "@/utils/anomaly-reasons";

type GeoPoint = {
  latitude: number | null;
  longitude: number | null;
};

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

type HeatmapMapProps = {
  diagnoses: GeoPoint[];
  topAnomalies?: SurveillanceAnomaly[];
};

const HeatmapMap = ({ diagnoses, topAnomalies = [] }: HeatmapMapProps) => {
  const id = useId();
  const mountRef = useRef(0);
  mountRef.current += 1;
  const mapKey = `${id}-${mountRef.current}`;
  const searchParams = useSearchParams();

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

  // Custom icon for targeted anomaly (GPS Pin)
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

  // Attempt to find the full anomaly object for the target location to display rich tooltip
  let targetAnomaly: SurveillanceAnomaly | null = null;
  if (hasTarget) {
    // Look through top anomalies first (they are more likely to be the ones alerted on)
    targetAnomaly = topAnomalies.find((a) => 
      a.latitude !== null && a.longitude !== null &&
      Math.abs(a.latitude - targetLat) < 0.0001 && 
      Math.abs(a.longitude - targetLng) < 0.0001
    ) || null;

    if (!targetAnomaly) {
      // If not in topAnomalies, look in all diagnoses (assuming diagnoses is actually SurveillanceAnomaly[])
      const foundInDiagnoses = diagnoses.find((d: any) => 
        d.latitude !== null && d.longitude !== null &&
        Math.abs(d.latitude - targetLat) < 0.0001 && 
        Math.abs(d.longitude - targetLng) < 0.0001
      ) as SurveillanceAnomaly | undefined;
      
      if (foundInDiagnoses) targetAnomaly = foundInDiagnoses;
    }
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
          className="map-tiles"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCenterUpdater />
        <HeatmapLayer diagnoses={diagnoses} />
        
        {/* Render Critical Anomalies as pulsating markers */}
        {topAnomalies.map((anomaly) => {
          if (anomaly.latitude == null || anomaly.longitude == null) return null;
          // Skip if this is the exact target coordinate, we'll render it separately below
          if (hasTarget && Math.abs(anomaly.latitude - targetLat) < 0.0001 && Math.abs(anomaly.longitude - targetLng) < 0.0001) return null;
          
          return (
            <Marker 
              key={`anomaly-${anomaly.id}`} 
              position={[anomaly.latitude, anomaly.longitude]}
              icon={criticalIcon}
            >
              <Tooltip className="bg-base-100 border-none shadow-xl rounded-lg text-base-content p-3" opacity={1}>
                <div className="font-semibold">{anomaly.user?.name || `Patient ID: ${anomaly.userId?.toString().slice(-6).toUpperCase()}`}</div>
                <div className="text-xs text-error font-medium mb-1">Score: {anomaly.anomaly_score.toFixed(3)}</div>
                <div className="text-xs opacity-80 mb-2">{anomaly.disease}</div>
                {anomaly.reason && (
                  <div className="flex flex-col gap-1">
                    {anomaly.reason.split("|").map((r, i) => (
                      <div key={i} className="text-[10px] bg-base-200 px-1.5 py-0.5 rounded text-base-content/80">
                        {getReasonLabel(r)}
                      </div>
                    ))}
                  </div>
                )}
              </Tooltip>
            </Marker>
          );
        })}

        {/* Render the targeted anomaly from URL if present */}
        {hasTarget && (
          <Marker position={[targetLat, targetLng]} icon={targetIcon}>
            <Tooltip className="bg-base-100 border-none shadow-xl rounded-lg text-base-content p-3" opacity={1}>
              {targetAnomaly ? (
                <>
                  <div className="font-semibold">{targetAnomaly.user?.name || `Patient ID: ${targetAnomaly.userId?.toString().slice(-6).toUpperCase()}`}</div>
                  <div className="text-xs text-error font-medium mb-1">Target Anomaly (Score: {targetAnomaly.anomaly_score?.toFixed(3) || "N/A"})</div>
                  <div className="text-xs opacity-80 mb-2">{targetAnomaly.disease}</div>
                  {targetAnomaly.reason && (
                    <div className="flex flex-col gap-1">
                      {targetAnomaly.reason.split("|").map((r, i) => (
                        <div key={i} className="text-[10px] bg-base-200 px-1.5 py-0.5 rounded text-base-content/80">
                          {getReasonLabel(r)}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="font-semibold">Target Anomaly</div>
                  {targetDisease && <div className="text-xs opacity-80 mb-1">{targetDisease}</div>}
                  <div className="text-[10px] text-base-content/60">View details in alerts</div>
                </>
              )}
            </Tooltip>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default HeatmapMap;
