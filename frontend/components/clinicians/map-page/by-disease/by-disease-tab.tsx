"use client";

import { DiseaseSelect } from "../disease-select";
import { DateRangeFilter } from "../date-range-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from "next/dynamic";
import useSelectedDiseaseStore from "@/stores/use-selected-disease-store";
import useDateRangeStore from "@/stores/use-date-range-store";
import { useEffect, useState, useMemo } from "react";
import { getDiseaseDiagnosesByDistricts } from "@/utils/diagnosis";
import type { GeoJsonObject } from "geojson";
import { Activity, MapPin, TrendingUp, AlertTriangle } from "lucide-react";
import { Diagnosis } from "@/lib/generated/prisma";
import FeaturePatientsModal from "../map/feature-patients-modal";

const ChoroplethMap = dynamic(() => import("../map/choropleth-map"), { ssr: false });

const ByDiseaseTab = () => {
  const { selectedDisease, setSelectedDisease } = useSelectedDiseaseStore();
  const { startDate, endDate, setStartDate, setEndDate } = useDateRangeStore();
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null);
  const [casesData, setCasesData] = useState<Record<string, number>>({});
  const [diagnoses, setDiagnoses] = useState<(Diagnosis)[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const fetchCasesData = async () => {
    setMapLoading(true);

    const { success, error } = await getDiseaseDiagnosesByDistricts(selectedDisease, startDate, endDate);

    if (error) {
      throw new Error(error);
    }

    if (success) {
      const { diagnoses, grouped } = success;

      const transformedData = grouped.reduce((acc, item) => {
        if (item.district) {
          acc[item.district] = item._count.id;
        }
        return acc;
      }, {} as Record<string, number>);

      setCasesData(transformedData);
      setDiagnoses(diagnoses);
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

  const {
    totalCases,
    affectedDistrictsCount,
    highestCases,
    highestDistrict,
    averageCases
  } = useMemo(() => {
    const cases = Object.values(casesData);
    const totalCases = cases.reduce((sum, count) => sum + count, 0);
    const affectedDistrictsCount = Object.keys(casesData).filter(key => casesData[key] > 0).length;
    const highestCases = cases.length > 0 ? Math.max(...cases) : 0;
    const highestDistrict = Object.keys(casesData).find(key => casesData[key] === highestCases) || "N/A";
    const averageCases = affectedDistrictsCount > 0 ? Math.round(totalCases / affectedDistrictsCount) : 0;

    return {
      totalCases,
      affectedDistrictsCount,
      highestCases,
      highestDistrict,
      averageCases
    };
  }, [casesData]);

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
            ) : (
              <ChoroplethMap
                geoData={geoData}
                casesData={casesData}
                diagnoses={diagnoses}
                onFeatureClick={(name) => setSelectedFeature(name)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {(mapLoading || !geoData) ? (
          <>
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-4 w-4" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="skeleton h-8 w-32 mb-2" />
                <div className="skeleton h-3 w-40" />
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-4 w-4" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="skeleton h-8 w-40 mb-2" />
                <div className="skeleton h-3 w-48" />
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <div className="skeleton h-4 w-28" />
                <div className="skeleton h-4 w-4" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="skeleton h-8 w-24 mb-2" />
                <div className="skeleton h-3 w-36" />
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <div className="skeleton h-4 w-28" />
                <div className="skeleton h-4 w-4" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="skeleton h-8 w-24 mb-2" />
                <div className="skeleton h-3 w-36" />
              </CardContent>
            </Card>
          </>
        ) : Object.keys(casesData).length > 0 ? (
          <>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Cases</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-2xl font-bold">{totalCases.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  For the selected disease and period
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Most Affected Area</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-2xl font-bold truncate" title={highestDistrict}>
                  {highestDistrict}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  With {highestCases.toLocaleString()} reported cases
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Affected Districts</CardTitle>
                <MapPin className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-2xl font-bold">{affectedDistrictsCount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Areas with at least 1 case
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average Cases</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-2xl font-bold">{averageCases.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Per affected district
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      <FeaturePatientsModal
        isOpen={!!selectedFeature}
        onClose={() => setSelectedFeature(null)}
        featureName={selectedFeature ?? ""}
        diagnoses={selectedFeature ? diagnoses.filter((d) => d.district === selectedFeature) : []}
      />
    </div>
  );
};

export default ByDiseaseTab;