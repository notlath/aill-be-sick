"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PatientClusterData } from "@/types";
import { DiseaseMapData, getMapDiseaseData } from "@/utils/map-data";
import { useEffect, useState } from "react";
import PhilippinesMap from "./philippines-map";

const DISEASES = [
  "Dengue",
  "Pneumonia",
  "Typhoid",
  "Diarrhea",
  "Measles",
  "Impetigo",
  "Influenza",
];

type MapContainerProps = {
  selectedTab: "disease" | "cluster" | "anomaly";
  clusters?: PatientClusterData;
  initialK?: number;
};

export function MapContainer({
  selectedTab,
  clusters = undefined,
  initialK = 4,
}: MapContainerProps) {
  const [selectedCluster, setSelectedCluster] = useState(
    clusters ? String(clusters.cluster_statistics[0].cluster_id) : "1",
  );
  const [k, setK] = useState(initialK);
  const [clusterOptions, setClusterOptions] = useState(
    clusters
      ? clusters.cluster_statistics.map((stat) => String(stat.cluster_id))
      : [],
  );
  const [diseaseData, setDiseaseData] = useState<DiseaseMapData | undefined>(
    undefined,
  );
  const [dataLoading, setDataLoading] = useState(true);

  // Filter States
  const [disease, setDisease] = useState<string>("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch all patient location data for map
  useEffect(() => {
    async function fetchMapData() {
      setDataLoading(true);

      const params: any = {};
      if (disease !== "All") params.disease = disease;
      if (startDate) params.startDate = new Date(startDate);
      if (endDate) params.endDate = new Date(endDate);

      const result = await getMapDiseaseData(params);

      if (result.success) {
        setDiseaseData(result.success);
      } else if (result.error) {
        console.error("Error fetching map data:", result.error);
      }
      setDataLoading(false);
    }

    fetchMapData();
  }, [selectedTab, disease, startDate, endDate]);

  // Fetch clusters when k changes
  useEffect(() => {
    async function fetchClusters() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:10000"}/api/patient-clusters?n_clusters=${k}`,
        );

        if (!res.ok) throw new Error("Failed to fetch clusters");

        const data = await res.json();
        const nClusters = data.n_clusters || k;
        const newOptions = Array.from({ length: nClusters }, (_, i) =>
          String(i + 1),
        );

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
    <div className="space-y-4">
      {/* Filters Overlay */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-base-200 p-4 rounded-lg relative z-50">
        {selectedTab === "disease" && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap">
              Disease:
            </label>
            <Select value={disease} onValueChange={setDisease}>
              <SelectTrigger className="w-40 bg-white shadow-sm">
                <SelectValue placeholder="Select disease" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Diseases</SelectItem>
                {DISEASES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-4 border-l border-base-300 pl-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">From:</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">To:</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      </div>

      <div className="relative">
        {dataLoading ? (
          <div className="flex items-center justify-center h-[800px] bg-base-200 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-sm text-base-content/60">
                Loading map data...
              </p>
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
    </div>
  );
}
