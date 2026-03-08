'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ByDiseaseTab from "../by-disease/by-disease-tab";
import ByClusterTab from "../by-cluster/by-cluster-tab";
import ByAnomalyTab from "../by-anomaly/by-anomaly-tab";
import useMapStore from "@/stores/use-map-store";

const MapTabs = () => {
  const { activeTab, setActiveTab } = useMapStore();

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'by-disease' | 'by-cluster' | 'by-anomaly')}>
      <TabsList>
        <TabsTrigger value="by-disease">By disease</TabsTrigger>
        <TabsTrigger value="by-cluster">By illness cluster</TabsTrigger>
        <TabsTrigger value="by-anomaly">By anomaly</TabsTrigger>
      </TabsList>

      <TabsContent value="by-disease">
        <ByDiseaseTab />
      </TabsContent>

      <TabsContent value="by-cluster">
        <ByClusterTab />
      </TabsContent>

      <TabsContent value="by-anomaly">
        <ByAnomalyTab />
      </TabsContent>
    </Tabs>
  )
}

export default MapTabs
