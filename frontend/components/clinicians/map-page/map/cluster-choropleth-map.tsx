"use client";

import { useId, useRef } from "react";
import type { GeoJsonObject } from "geojson";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import ClusterChoroplethLayer from "./cluster-choropleth-layer";
import ClusterChoroplethLegend from "./cluster-choropleth-legend";
import type { IllnessRecord } from "@/types";
import type { ClusterLegendBin } from "@/utils/cluster-heatmap";

const MAP_CENTER: [number, number] = [14.71, 121.113];
const MAP_ZOOM = 14;
const MAP_STYLE = { height: "600px", width: "100%" };

type ClusterChoroplethMapProps = {
  casesData: Record<string, number>;
  geoData: GeoJsonObject;
  illnesses: IllnessRecord[];
  legendBins: ClusterLegendBin[];
  legendTitle: string;
  zeroColor: string;
  onFeatureClick?: (featureName: string) => void;
  selectedGroupLabel: string;
};

const ClusterChoroplethMap = ({
  casesData,
  geoData,
  illnesses,
  legendBins,
  legendTitle,
  zeroColor,
  onFeatureClick,
  selectedGroupLabel,
}: ClusterChoroplethMapProps) => {
  const id = useId();
  const mountRef = useRef(0);
  mountRef.current += 1;
  const mapKey = `${id}-${mountRef.current}`;

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
        <ClusterChoroplethLayer
          casesData={casesData}
          geoData={geoData}
          illnesses={illnesses}
          legendBins={legendBins}
          zeroColor={zeroColor}
          selectedGroupLabel={selectedGroupLabel}
          onFeatureClick={onFeatureClick}
        />
        <ClusterChoroplethLegend title={legendTitle} bins={legendBins} zeroColor={zeroColor} />
      </MapContainer>
    </div>
  );
};

export default ClusterChoroplethMap;
