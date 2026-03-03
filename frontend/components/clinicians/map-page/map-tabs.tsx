'use client'

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { MapContainer } from "./map-container";
import { PatientClusterData, IllnessClusterData } from "@/types";

type MapTabsProps = {
  clusters?: PatientClusterData;
  illnessClusters?: IllnessClusterData;
  initialK?: number;
}

const MapTabs = ({ clusters, illnessClusters, initialK }: MapTabsProps) => {
  const [selectedTab, setSelectedTab] = useState<string>("disease");

  return (
    <section>
      <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto mb-4">
          <TabsTrigger value="disease">By disease</TabsTrigger>
          <TabsTrigger value="cluster">By patient cluster</TabsTrigger>
          <TabsTrigger value="illness-cluster">By illness pattern</TabsTrigger>
          <TabsTrigger value="anomaly">By anomaly</TabsTrigger>
        </TabsList>
      </Tabs>
      <MapContainer 
        selectedTab={selectedTab as "disease" | "cluster" | "anomaly" | "illness-cluster"} 
        clusters={clusters} 
        illnessClusters={illnessClusters}
        initialK={initialK} 
      />
    </section>
  )
}

export default MapTabs