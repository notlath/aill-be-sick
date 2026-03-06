"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MapContainer } from "./map-container";
import { PatientClusterData, IllnessClusterData } from "@/types";

type MapTabsProps = {
  clusters?: PatientClusterData;
  illnessClusters?: IllnessClusterData;
  initialK?: number;
};

const MapTabs = ({ clusters, illnessClusters, initialK }: MapTabsProps) => {
  const searchParams = useSearchParams();
  const [selectedTab, setSelectedTab] = useState<string>("disease");
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  // Initialize from searchParams
  useEffect(() => {
    const tab = searchParams.get("tab");
    const cluster = searchParams.get("cluster");

    if (tab === "illness-cluster") {
      setSelectedTab("illness-cluster");
    }

    if (cluster) {
      setSelectedCluster(cluster);
    }
  }, [searchParams]);

  return (
    <section>
      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 h-auto mb-4">
          <TabsTrigger value="disease">By disease</TabsTrigger>
          {/* <TabsTrigger value="cluster">By patient cluster</TabsTrigger> */}
          <TabsTrigger value="illness-cluster">By illness cluster</TabsTrigger>
          <TabsTrigger value="anomaly">By anomaly</TabsTrigger>
        </TabsList>
      </Tabs>
      <MapContainer
        selectedTab={selectedTab as "disease" | "anomaly" | "illness-cluster"}
        clusters={clusters}
        illnessClusters={illnessClusters}
        initialK={initialK}
        preselectedCluster={selectedCluster}
      />
    </section>
  );
};

export default MapTabs;
