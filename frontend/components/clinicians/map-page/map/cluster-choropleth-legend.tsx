import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { useTheme } from "next-themes";
import type { ClusterLegendBin } from "@/utils/cluster-heatmap";

type ClusterChoroplethLegendProps = {
  title: string;
  bins: ClusterLegendBin[];
  zeroColor: string;
};

const ClusterChoroplethLegend = ({
  title,
  bins,
  zeroColor,
}: ClusterChoroplethLegendProps) => {
  const map = useMap();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const L = require("leaflet");
    const legend = new L.control({ position: "bottomright" });

    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend card");

      div.style.background = isDark ? "rgba(30, 30, 30, 0.85)" : "rgba(255, 255, 255, 0.75)";
      div.style.backdropFilter = "blur(8px)";
      div.style.borderRadius = "12px";
      div.style.padding = "12px 14px";
      div.style.fontFamily = "var(--font-geist-sans), 'Geist Fallback'";
      div.style.fontWeight = "500";
      div.style.color = isDark ? "#e5e5e5" : "#1a1a1a";

      div.innerHTML += `<h4 style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px; color: ${isDark ? '#ffffff' : '#000000'};">${title}</h4>`;

      div.innerHTML +=
        `<div style="display: flex; align-items: center; margin-bottom: 6px;">` +
        `<i style="background:${zeroColor}; border: 2px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}; width: 24px; height: 16px; display: inline-block; margin-right: 8px; border-radius: 2px;"></i> ` +
        `<span style="font-size: 13px; font-weight: 500; color: ${isDark ? '#e5e5e5' : '#1a1a1a'};">0</span>` +
        `</div>`;

      for (const bin of bins) {
        div.innerHTML +=
          `<div style="display: flex; align-items: center; margin-bottom: 6px;">` +
          `<i style="background:${bin.color}; border: 2px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}; width: 24px; height: 16px; display: inline-block; margin-right: 8px; border-radius: 2px;"></i> ` +
          `<span style="font-size: 13px; font-weight: 500; color: ${isDark ? '#e5e5e5' : '#1a1a1a'};">${bin.label}</span>` +
          `</div>`;
      }

      return div;
    };

    legend.addTo(map);

    return () => {
      legend.remove();
    };
  }, [map, title, bins, zeroColor, isDark]);

  return null;
};

export default ClusterChoroplethLegend;
