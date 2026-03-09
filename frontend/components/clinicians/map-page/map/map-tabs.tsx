"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ByDiseaseTab from "../by-disease/by-disease-tab";
import ByClusterTab from "../by-cluster/by-cluster-tab";
import ByAnomalyTab from "../by-anomaly/by-anomaly-tab";
import useMapStore from "@/stores/use-map-store";
import { parseIllnessClusterNavigationQuery } from "@/utils/illness-cluster-navigation";

const MapTabs = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activeTab, setActiveTab } = useMapStore();

  const urlTab = useMemo(() => {
    const rawTab = searchParams.get("tab");
    if (
      rawTab !== "by-disease" &&
      rawTab !== "by-cluster" &&
      rawTab !== "by-anomaly"
    ) {
      return null;
    }

    const { tab } = parseIllnessClusterNavigationQuery(searchParams);
    return tab;
  }, [searchParams]);

  const resolvedActiveTab = urlTab ?? activeTab;

  useEffect(() => {
    if (!urlTab) {
      return;
    }

    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [activeTab, setActiveTab, urlTab]);

  const handleTabChange = (value: string) => {
    const nextTab = value as "by-disease" | "by-cluster" | "by-anomaly";
    setActiveTab(nextTab);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", nextTab);

    const nextQuery = nextParams.toString();
    const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextHref, { scroll: false });
  };

  return (
    <Tabs value={resolvedActiveTab} onValueChange={handleTabChange}>
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
  );
};

export default MapTabs;
