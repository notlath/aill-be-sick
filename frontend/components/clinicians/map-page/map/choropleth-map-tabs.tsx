'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ByDiseaseTab from "../by-disease/by-disease-tab";
import ByClusterTab from "../by-cluster/by-cluster-tab";
import useChoroplethMapStore from "@/stores/use-choropleth-map-store";

const ChoroplethMapTabs = () => {
  const { activeTab, setActiveTab } = useChoroplethMapStore();

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
        {/* Content for By anomaly tab */}
      </TabsContent>
    </Tabs>
  )
}

export default ChoroplethMapTabs
