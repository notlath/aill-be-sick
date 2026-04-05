import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { useTheme } from 'next-themes';
import useSelectedDiseaseStore from "@/stores/use-selected-disease-store";
import { getColor } from "@/utils/map-helpers";

type ChoroplethLegendProps = {
  label?: string;
}

const ChoroplethLegend = ({ label = "Legend" }: ChoroplethLegendProps) => {
  const map = useMap();
  const { selectedDisease } = useSelectedDiseaseStore();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const L = require("leaflet");
    const legend = new L.control({ position: 'bottomright' });

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend card');

      div.style.background = isDark ? "rgba(30, 30, 30, 0.85)" : "rgba(255, 255, 255, 0.75)";
      div.style.backdropFilter = "blur(8px)";
      div.style.borderRadius = "12px";
      div.style.padding = "12px 14px";
      div.style.fontFamily = "var(--font-geist-sans), 'Geist Fallback'";
      div.style.fontWeight = "500";
      div.style.color = isDark ? "#e5e5e5" : "#1a1a1a";

      const grades = [0, 1, 10, 20, 50, 100];
      const colors = grades.map((grade) => getColor(grade, selectedDisease));
      const diseaseName = selectedDisease === 'all' ? "Disease Cases" : `${selectedDisease} Cases`;

      div.innerHTML += `<h4 style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px; color: ${isDark ? '#ffffff' : '#000000'};">${diseaseName} ${label}</h4>`;

      for (let i = 0; i < grades.length; i++) {
        let labelText = '';
        if (grades[i] === 0) {
          labelText = '0';
        } else {
          labelText = `${grades[i]}${grades[i + 1] ? '&ndash;' + grades[i + 1] : '+'}`;
        }

        div.innerHTML +=
          `<div style="display: flex; align-items: center; margin-bottom: 6px;">` +
          `<i style="background:${colors[i]}; border: 2px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}; width: 24px; height: 16px; display: inline-block; margin-right: 8px; border-radius: 2px;"></i> ` +
          `<span style="font-size: 13px; font-weight: 500; color: ${isDark ? '#e5e5e5' : '#1a1a1a'};">${labelText}</span>` +
          `</div>`;
      }

      return div;
    }

    legend.addTo(map);

    return () => {
      legend.remove();
    }
  }, [map, selectedDisease, label, isDark])

  return null
}

export default ChoroplethLegend
