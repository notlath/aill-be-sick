"use client";

import { DiseaseSelect } from "../disease-select";
import { DateRangeFilter } from "../date-range-filter";
import { Card, CardContent } from "@/components/ui/card";
import dynamic from "next/dynamic";
import useSelectedDiseaseStore from "@/stores/use-selected-disease-store";
import useDateRangeStore from "@/stores/use-date-range-store";
import { useEffect, useState } from "react";
import { getDiseaseDiagnosesByDistricts } from "@/utils/diagnosis";
import type { GeoJsonObject } from "geojson";

const ChoroplethMap = dynamic(() => import("../map/choropleth-map"), { ssr: false });

const ByDiseaseTab = () => {
  const { selectedDisease, setSelectedDisease } = useSelectedDiseaseStore();
  const { startDate, endDate, setStartDate, setEndDate } = useDateRangeStore();
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null);
  const [casesData, setCasesData] = useState<Record<string, number>>({});
  const [mapLoading, setMapLoading] = useState(true);

  const fetchCasesData = async () => {
    setMapLoading(true);

    const { success, error } = await getDiseaseDiagnosesByDistricts(selectedDisease, startDate, endDate);

    if (error) {
      throw new Error(error);
    }
    
    if (success) {
      const transformedData = success.reduce((acc, item) => {
        if (item.district) {
          acc[item.district] = item._count.id;
        }
        return acc;
      }, {} as Record<string, number>);

      setCasesData(transformedData);
    }

    setMapLoading(false);
  }

  useEffect(() => {
    fetchCasesData();
  }, [selectedDisease, startDate, endDate]);

  // Fetch the GeoJSON from /public. Error is captured so the loading state
  // doesn't hang silently on network failure.
  useEffect(() => {
    fetch("/geojson/bagong_silangan.geojson")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load GeoJSON: ${res.status}`);
        return res.json();
      })
      .then((data: GeoJsonObject) => setGeoData(data))
      .catch((err: unknown) => {
        throw Error(err instanceof Error ? err.message : "Unknown error")
      }
      );
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-between sm:flex-row gap-4">
        <DiseaseSelect
          value={selectedDisease}
          onValueChange={setSelectedDisease}
        />
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </div>
      <div>
        <Card>
          <CardContent className="p-8">
            {(mapLoading || !geoData) ? (
              <div className="rounded-xl overflow-hidden" aria-label="Loading map">
                <div className="skeleton h-[600px] w-full" />
              </div>
            ) : <ChoroplethMap geoData={geoData} casesData={casesData} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ByDiseaseTab;