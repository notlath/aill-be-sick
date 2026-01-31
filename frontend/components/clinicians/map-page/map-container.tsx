"use client";

import { useState } from "react";
import { useEffect } from "react";
import { PatientClusterData } from "@/types";
import PhilippinesMap from "./philippines-map";

type MapContainerProps = {
  selectedTab: "disease" | "cluster" | "anomaly";
  clusters?: PatientClusterData;
  initialK?: number;
}

export function MapContainer({ selectedTab, clusters = undefined, initialK = 4 }: MapContainerProps) {
  const [selectedDisease, setSelectedDisease] = useState("Dengue");
  const [selectedCluster, setSelectedCluster] = useState(clusters ? String(clusters.cluster_statistics[0].cluster_id) : "1");
  const [k, setK] = useState(initialK);
  const [clusterOptions, setClusterOptions] = useState(clusters ? clusters.cluster_statistics.map(stat => String(stat.cluster_id)) : []);
  const [loading, setLoading] = useState(false);

  // Fetch clusters when k changes
  useEffect(() => {
    async function fetchClusters() {
      setLoading(true);

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
      } finally {
        setLoading(false);
      }
    }

    fetchClusters();
  }, [k]);

  return (
    <div>
      <PhilippinesMap />
    </div>
  );
}
