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
  const { activeTab, setActiveTab, setFocusLocation, setFocusDisease, clearFocus } = useMapStore();

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

  const urlDisease = useMemo(() => {
    return searchParams.get("disease");
  }, [searchParams]);

  const urlFocusLocation = useMemo(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const zoom = searchParams.get("zoom");

    if (lat == null || lng == null) return null;

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const zoomNum = zoom != null ? parseInt(zoom, 10) : undefined;

    if (isNaN(latNum) || isNaN(lngNum)) return null;

    return {
      lat: latNum,
      lng: lngNum,
      zoom: zoomNum,
    };
  }, [searchParams]);

  const resolvedActiveTab = urlTab ?? activeTab;

  useEffect(() => {
    // Set focus location and disease from URL params when they change
    console.log('[MapTabs] urlFocusLocation:', urlFocusLocation, 'urlDisease:', urlDisease);
    if (urlFocusLocation) {
      console.log('[MapTabs] Setting focus location:', urlFocusLocation);
      setFocusLocation(urlFocusLocation);
    }
    if (urlDisease) {
      // Convert uppercase disease name to title case (e.g., "DENGUE" -> "Dengue")
      const titleCaseDisease = urlDisease.charAt(0).toUpperCase() + urlDisease.slice(1).toLowerCase();
      console.log('[MapTabs] Setting focus disease:', urlDisease, '->', titleCaseDisease);
      setFocusDisease(titleCaseDisease);
    }
  }, [urlFocusLocation, urlDisease, setFocusLocation, setFocusDisease]);

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
      <TabsList className="w-full flex sm:inline-flex sm:w-auto overflow-x-auto">
        <TabsTrigger value="by-disease" className="flex-1 sm:flex-none">
          By disease
        </TabsTrigger>
        <TabsTrigger value="by-cluster" className="flex-1 sm:flex-none">
          By illness group
        </TabsTrigger>
        <TabsTrigger value="by-anomaly" className="flex-1 sm:flex-none">
          By anomaly
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
