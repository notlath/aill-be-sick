"use client";

import { useMap } from "react-leaflet";
import { useEffect, useRef } from "react";
import L from "leaflet";
import type { SurveillanceAnomaly } from "@/types";
import { parseReasonCodes, getReasonLabel } from "@/utils/anomaly-reasons";

type MapPoint = {
  latitude: number | null;
  longitude: number | null;
  disease?: string;
  district?: string | null;
  createdAt?: Date | string | null;
};

type PointItem = MapPoint | SurveillanceAnomaly;

type GroupedPoint = {
  lat: number;
  lng: number;
  points: PointItem[];
};

interface InteractivePointsLayerProps {
  points: PointItem[];
  excludedCoords?: Set<string>;
  onPointClick: (point: PointItem) => void;
  showDate?: boolean;
  showReasons?: boolean;
}

const ZOOM_THRESHOLD = 15;

function getZoomOpacity(zoom: number): number {
  if (zoom < ZOOM_THRESHOLD) return 0;
  if (zoom === 15) return 0.15;
  if (zoom === 16) return 0.4;
  return 0.7;
}


function getZoomRadius(zoom: number): number {
  if (zoom < ZOOM_THRESHOLD) return 0;
  if (zoom === 14) return 1;
  if (zoom === 15) return 2;
  if (zoom === 16) return 3;
  return 4;
}

function groupByLocation(points: PointItem[]): GroupedPoint[] {
  const groups = new Map<string, GroupedPoint>();
  for (const p of points) {
    if (p.latitude == null || p.longitude == null) continue;
    const key = `${p.latitude.toFixed(6)},${p.longitude.toFixed(6)}`;
    if (!groups.has(key)) {
      groups.set(key, { lat: p.latitude, lng: p.longitude, points: [] });
    }
    groups.get(key)!.points.push(p);
  }
  return Array.from(groups.values());
}

function formatDate(dateStr: Date | string | null | undefined): string {
  if (!dateStr) return "Unknown date";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Unknown date";
  }
}

function getPointDisease(point: PointItem): string {
  return point.disease ?? "Unknown";
}

function getPointDistrict(point: PointItem): string | null {
  return point.district ?? null;
}

function getPointDate(point: PointItem): Date | string | null | undefined {
  return point.createdAt ?? null;
}

const InteractivePointsLayer = ({
  points,
  excludedCoords,
  onPointClick,
  showDate = true,
  showReasons = false,
}: InteractivePointsLayerProps) => {
  const map = useMap();
  const markersRef = useRef<L.CircleMarker[]>([]);

  useEffect(() => {
    const filtered = points.filter((p) => {
      if (p.latitude == null || p.longitude == null) return false;
      if (isNaN(p.latitude) || isNaN(p.longitude)) return false;
      if (p.latitude === 0 && p.longitude === 0) return false;
      if (excludedCoords) {
        const key = `${p.latitude.toFixed(6)},${p.longitude.toFixed(6)}`;
        if (excludedCoords.has(key)) return false;
      }
      return true;
    });

    const groups = groupByLocation(filtered);
    const currentZoom = map.getZoom();

    const newMarkers: L.CircleMarker[] = [];

    for (const group of groups) {
      const representative = group.points[0];
      const count = group.points.length;
      const disease = getPointDisease(representative);
      const district = getPointDistrict(representative);
      const dateStr = getPointDate(representative);

      const diseaseLabel = count > 1 ? `${disease} (${count} cases)` : disease;

      let tooltipHtml = `<div style="font-weight:600;font-size:13px;margin-bottom:2px">${diseaseLabel}</div>`;
      
      const locationParts = [district].filter(Boolean);
      const locationLabel = locationParts.length > 0 ? locationParts.join(", ") : "No location info";
      tooltipHtml += `<div style="font-size:11px;opacity:0.7;margin-bottom:2px">${locationLabel}</div>`;
      
      if (dateStr) {
        tooltipHtml += `<div style="font-size:11px;opacity:0.7;margin-bottom:4px">Date: ${formatDate(dateStr)}</div>`;
      }

      if (showReasons && "reason" in representative && representative.reason) {
        const codes = parseReasonCodes(representative.reason as string | null);
        if (codes.length > 0) {
          tooltipHtml += `<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px">`;
          for (const code of codes) {
            const label = getReasonLabel(code);
            tooltipHtml += `<span style="font-size:10px;background:rgba(128,128,128,0.15);padding:1px 6px;border-radius:4px">${label}</span>`;
          }
          tooltipHtml += `</div>`;
        }
      }

      const marker = L.circleMarker([group.lat, group.lng], {
        radius: getZoomRadius(currentZoom),
        fillColor: "hsl(var(--p))",
        color: "hsl(var(--p) / 0.8)",
        weight: 1,
        opacity: getZoomOpacity(currentZoom),
        fillOpacity: getZoomOpacity(currentZoom),
      });

      marker.bindTooltip(tooltipHtml, {
        sticky: true,
        direction: "top",
        offset: [0, -5],
        className: "leaflet-point-tooltip",
        opacity: 1,
      });

      marker.on("click", () => {
        onPointClick(representative);
      });

      marker.addTo(map);
      newMarkers.push(marker);
    }

    markersRef.current = newMarkers;

    return () => {
      for (const m of newMarkers) {
        map.removeLayer(m);
      }
    };
  }, [map, points, excludedCoords, onPointClick]);

  useEffect(() => {
    const handleZoom = () => {
      const zoom = map.getZoom();
      for (const marker of markersRef.current) {
        marker.setStyle({
          radius: getZoomRadius(zoom),
          opacity: getZoomOpacity(zoom),
          fillOpacity: getZoomOpacity(zoom),
        });
      }
    };

    map.on("zoomend", handleZoom);
    return () => {
      map.off("zoomend", handleZoom);
    };
  }, [map]);

  return null;
};

export default InteractivePointsLayer;
