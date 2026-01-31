'use client'

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { MapContainer } from "./map-container";
import { PatientClusterData } from "@/types";

type MapTabsProps = {
  clusters?: PatientClusterData;
  initialK?: number;
}

const MapTabs = ({ clusters, initialK }: MapTabsProps) => {
  const [selectedTab, setSelectedTab] = useState<string>("disease");

  return (
    <section>
      <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto mb-4">
          <TabsTrigger value="disease">By disease</TabsTrigger>
          <TabsTrigger value="cluster">By cluster</TabsTrigger>
          <TabsTrigger value="anomaly">By anomaly</TabsTrigger>
        </TabsList>
      </Tabs>
      <MapContainer selectedTab={selectedTab as "disease" | "cluster" | "anomaly"} clusters={clusters} initialK={initialK} />
    </section>
  )
}

export default MapTabs