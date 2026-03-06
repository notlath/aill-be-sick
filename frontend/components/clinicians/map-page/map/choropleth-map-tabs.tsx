

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ByDiseaseTab from "../by-disease/by-disease-tab";

const ChoroplethMapTabs = () => {
  return (
    <Tabs defaultValue="by-disease">
      <TabsList>
        <TabsTrigger value="by-disease">By disease</TabsTrigger>
        <TabsTrigger value="by-cluster">By illness cluster</TabsTrigger>
        <TabsTrigger value="by-anomaly">By anomaly</TabsTrigger>
      </TabsList>

      <TabsContent value="by-disease">
        <ByDiseaseTab />
      </TabsContent>

      <TabsContent value="by-cluster">
        {/* Content for By illness cluster tab */}
      </TabsContent>

      <TabsContent value="by-anomaly">
        {/* Content for By anomaly tab */}
      </TabsContent>
    </Tabs>
  )
}

export default ChoroplethMapTabs