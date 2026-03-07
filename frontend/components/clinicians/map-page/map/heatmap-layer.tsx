import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import { HeatPoint } from "@/utils/map-helpers";

interface HeatmapLayerProps {
  points: HeatPoint[];
  radius?: number;
  blur?: number;
  minOpacity?: number;
}

const HeatmapLayer = ({
  points,
  radius = 50,
  blur = 30,
  minOpacity = 0.3,
}: HeatmapLayerProps) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Repeat each centroid once per case (capped at 100) at full intensity.
    // leaflet.heat accumulates overlapping points — more repetitions = hotter
    // color — so 1 copy stays blue and 100 copies become red.
    const latlngs: L.HeatLatLngTuple[] = points.flatMap((p) => {
      const count = Math.min(Math.round(p.intensity), 100);
      return Array.from({ length: count }, () => [p.lat, p.lng, 1.0] as L.HeatLatLngTuple);
    });

    const heat = L.heatLayer(latlngs, {
      radius,
      blur,
      max: 1,
      minOpacity,
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points, radius, blur, minOpacity]);

  return null;
};

export default HeatmapLayer;
