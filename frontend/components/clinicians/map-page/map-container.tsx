"use client";

import { useState, useEffect } from "react";
import { PatientClusterData } from "@/types";
import PhilippinesMap from "./philippines-map";
import { getMapDiseaseData, DiseaseMapData } from "@/utils/map-data";

type MapContainerProps = {
  selectedTab: "disease" | "cluster" | "anomaly";
  clusters?: PatientClusterData;
  initialK?: number;
}

export function MapContainer({ selectedTab, clusters = undefined, initialK = 4 }: MapContainerProps) {
  const [selectedCluster, setSelectedCluster] = useState(clusters ? String(clusters.cluster_statistics[0].cluster_id) : "1");
  const [k, setK] = useState(initialK);
  const [clusterOptions, setClusterOptions] = useState(clusters ? clusters.cluster_statistics.map(stat => String(stat.cluster_id)) : []);
  const [diseaseData, setDiseaseData] = useState<DiseaseMapData | undefined>(undefined);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch all patient location data for map on mount
  useEffect(() => {
    async function fetchMapData() {
      setDataLoading(true);
      const result = await getMapDiseaseData();
      
      if (result.success) {
        setDiseaseData(result.success);
      } else if (result.error) {
        console.error('Error fetching map data:', result.error);
      }
      setDataLoading(false);
    }

    fetchMapData();
  }, [selectedTab]);

  // Fetch clusters when k changes
  useEffect(() => {
    async function fetchClusters() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:10000"}/api/patient-clusters?n_clusters=${k}`);

        if (!res.ok) throw new Error("Failed to fetch clusters");

        const data = await res.json();
        const nClusters = data.n_clusters || k;
        const newOptions = Array.from({ length: nClusters }, (_, i) => String(i + 1));

        setClusterOptions(newOptions);

        if (!newOptions.includes(selectedCluster)) {
          setSelectedCluster(newOptions[0]);
        }
      } catch (err) {
        // fallback to previous
      }
    }

    fetchClusters();
  }, [k, selectedCluster]);

  return (
    <div>
      {dataLoading ? (
        <div className="flex items-center justify-center h-[800px] bg-base-200 rounded-lg">
          <div className="flex flex-col items-center gap-4">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-sm text-base-content/60">Loading map data...</p>
          </div>
        </div>
      ) : (
        <PhilippinesMap 
          selectedTab={selectedTab}
          selectedCluster={selectedCluster}
          diseaseData={diseaseData}
        />
      )}
    </div>
  );
}
