"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ByDiseaseTab from "../by-disease/by-disease-tab";
import ByClusterTab from "../by-cluster/by-cluster-tab";
import ByAnomalyTab from "../by-anomaly/by-anomaly-tab";
import useMapStore from "@/stores/use-map-store";
import { parseIllnessClusterNavigationQuery } from "@/utils/illness-cluster-navigation";
import useSelectedDiseaseStore from "@/stores/use-selected-disease-store";
import type { DiseaseType } from "@/stores/use-selected-disease-store";

const MapTabs = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activeTab, setActiveTab } = useMapStore();
  const { selectedDisease, setSelectedDisease } = useSelectedDiseaseStore();

  useEffect(() => {
    const urlDisease = searchParams.get("disease");
    if (urlDisease && urlDisease !== selectedDisease) {
      // Allowed disease values (title case)
      const allowedDiseases: DiseaseType[] = [
        "all",
        "Dengue",
        "Pneumonia",
        "Typhoid",
        "Diarrhea",
        "Measles",
        "Influenza",
      ];

      // Find case-insensitive match
      const matchedDisease = allowedDiseases.find(
        (d) => d.toLowerCase() === urlDisease.toLowerCase(),
      );

      if (matchedDisease && matchedDisease !== selectedDisease) {
        setSelectedDisease(matchedDisease);
      }
    }
  }, [searchParams, selectedDisease, setSelectedDisease]);

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
    
    // Clear extra params when switching tabs
    nextParams.delete("lat");
    nextParams.delete("lng");
    nextParams.delete("disease");

    const nextQuery = nextParams.toString();
    const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextHref, { scroll: false });
  };

  return (
    <Tabs value={resolvedActiveTab} onValueChange={handleTabChange}>
      <TabsList className="w-full flex sm:inline-flex sm:w-auto overflow-x-auto">
        <TabsTrigger value="by-disease" className="flex-1 sm:flex-none">
          By disease
        </TabsTrigger>
        <TabsTrigger value="by-cluster" className="flex-1 sm:flex-none">
          By case group
        </TabsTrigger>
        <TabsTrigger value="by-anomaly" className="flex-1 sm:flex-none">
          Flagged cases
        </TabsTrigger>
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
