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
      <TabsList className="w-full flex sm:inline-flex sm:w-auto overflow-x-auto">
        <TabsTrigger value="by-disease" className="flex-1 sm:flex-none">By disease</TabsTrigger>
        <TabsTrigger value="by-cluster" className="flex-1 sm:flex-none">By illness cluster</TabsTrigger>
        <TabsTrigger value="by-anomaly" className="flex-1 sm:flex-none">By anomaly</TabsTrigger>
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
