import { useEffect } from "react";
import { useMap } from "react-leaflet";

// Matches leaflet.heat's default thermal gradient
const THERMAL_GRADIENT = "linear-gradient(to right, blue, cyan, lime, yellow, red)";

const HeatmapLegend = () => {
  const map = useMap();

  useEffect(() => {
    const L = require("leaflet");
    const legend = new L.control({ position: "bottomright" });

    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend");

      div.style.background = "rgba(255, 255, 255, 0.75)";
      div.style.backdropFilter = "blur(8px)";
      div.style.borderRadius = "12px";
      div.style.padding = "12px 14px";
      div.style.fontFamily = "var(--font-geist-sans), sans-serif";
      div.style.fontWeight = "500";
      div.style.minWidth = "160px";

      div.innerHTML =
        `<h4 style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px;">Disease Cases</h4>` +
        `<div style="width: 100%; height: 12px; border-radius: 6px; background: ${THERMAL_GRADIENT}; margin-bottom: 6px;"></div>` +
        `<div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 500; color: #666;">` +
        `<span>Fewer cases</span><span>More cases</span>` +
        `</div>`;

      return div;
    };

    legend.addTo(map);

    return () => {
      try {
        legend.remove();
      } catch (_) {
        // Suppress errors when map is already unmounted
      }
    };
  }, [map]);

  return null;
};

export default HeatmapLegend;
