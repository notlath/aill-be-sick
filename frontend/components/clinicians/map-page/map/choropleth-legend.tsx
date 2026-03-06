import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

type ChoroplethLegendProps = {
  label?: string;
}

const ChoroplethLegend = ({ label = "Legend" }: ChoroplethLegendProps) => {
  const map = useMap();
  
  useEffect(() => {
    const L = require("leaflet");
    const legend = new L.control({ position: 'bottomright' });

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend card');
      
      div.style.background = "rgba(255, 255, 255, 0.8)";
      div.style.backdropFilter = "blur(8px)";
      div.style.borderRadius = "12px";
      div.style.padding = "12px 14px";

      const grades = [0, 10, 20, 50, 100];
      const colors = ['#ffffcc', '#c2e699', '#78c679', '#31a354', '#006837'];

      div.innerHTML += `<h4>${label}</h4>`;
      
      for (let i = 0; i < grades.length; i++) {
        div.innerHTML +=
          `<i style="background:${colors[i]}"></i> ` +
          `${grades[i]}${grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+'}`;
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
  }, [map])

  return null
}

export default ChoroplethLegend
