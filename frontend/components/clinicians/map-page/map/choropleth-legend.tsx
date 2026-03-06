import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import useSelectedDiseaseStore from "@/stores/use-selected-disease-store";
import { getColor } from "@/utils/map-helpers";

type ChoroplethLegendProps = {
  label?: string;
}

const ChoroplethLegend = ({ label = "Legend" }: ChoroplethLegendProps) => {
  const map = useMap();
  const { selectedDisease } = useSelectedDiseaseStore();

  useEffect(() => {
    const L = require("leaflet");
    const legend = new L.control({ position: 'bottomright' });

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend card');

      div.style.background = "rgba(255, 255, 255, 0.8)";
      div.style.backdropFilter = "blur(8px)";
      div.style.borderRadius = "12px";
      div.style.padding = "12px 14px";

      const grades = [0, 1, 10, 20, 50, 100];
      const colors = grades.map((grade) => getColor(grade, selectedDisease));

      div.innerHTML += `<h4>${label}</h4>`;

      for (let i = 0; i < grades.length; i++) {
        let labelText = '';
        if (grades[i] === 0) {
          labelText = '0<br>';
        } else {
          labelText = `${grades[i]}${grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+'}`;
        }

        div.innerHTML +=
          `<i style="background:${colors[i]}; border: 1px solid rgba(0,0,0,0.1);"></i> ` + labelText;
      }

      return div;
    }

    legend.addTo(map);

    // Cleanup on unmount — guard against the map already being destroyed
    // during client-side navigation, which would throw on _targets access.
    return () => {
      try {
        legend.remove();
      } catch {
        // Map was already removed; nothing to clean up.
      }
    }
  }, [map, selectedDisease, label])

  return null
}

export default ChoroplethLegend
