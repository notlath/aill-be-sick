"use client";

import { DiseaseSelect } from "../disease-select";
import { DateRangeFilter } from "../date-range-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from "next/dynamic";
import useSelectedDiseaseStore from "@/stores/use-selected-disease-store";
import useDateRangeStore from "@/stores/use-date-range-store";
import { useEffect, useState, useMemo } from "react";
import { getDiseaseDiagnosesByDistricts, getDiagnosesWithCoordinates } from "@/utils/diagnosis";
import { Activity, MapPin, TrendingUp, AlertTriangle } from "lucide-react";
import { Diagnosis } from "@/lib/generated/prisma";
import FeaturePatientsModal from "../map/feature-patients-modal";
import { useGeoJsonData } from "@/hooks/map-hooks/use-geojson-data";
import ViewSelect from "../view-select";
import { DiseaseTimelineChart } from "./disease-timeline-chart";

const ChoroplethMap = dynamic(() => import("../map/choropleth-map"), { ssr: false });
const HeatmapMap = dynamic(() => import("../map/heatmap-map"), { ssr: false });

const ByDiseaseTab = () => {
  const [view, setView] = useState<"coordinates" | "district">("coordinates");
  const { selectedDisease, setSelectedDisease } = useSelectedDiseaseStore();
  const { startDate, endDate, setStartDate, setEndDate } = useDateRangeStore();

  // District view state
  const [casesData, setCasesData] = useState<Record<string, number>>({});
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);

  // Coordinates view state
  const [heatmapDiagnoses, setHeatmapDiagnoses] = useState<Diagnosis[]>([]);
  const [unpinnedDiagnoses, setUnpinnedDiagnoses] = useState<Diagnosis[]>([]);
  const [totalDiagnosesCount, setTotalDiagnosesCount] = useState(0);
  const [coordinatesModal, setCoordinatesModal] = useState<"total" | "pinned" | "unpinned" | null>(null);

  const [mapLoading, setMapLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const { geoData, loading: geoLoading, error: geoError } = useGeoJsonData(
    "/geojson/bagong_silangan.geojson",
  );

  useEffect(() => {
    let ignore = false;

    const fetchDistrictData = async () => {
      setMapLoading(true);

      const { success, error } = await getDiseaseDiagnosesByDistricts(
        selectedDisease,
        startDate,
        endDate,
      );

      if (ignore) return;

      if (error) {
        console.error(error);
        setMapLoading(false);
        return;
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
    };

    const fetchCoordinatesData = async () => {
      setMapLoading(true);

      const { success, error } = await getDiagnosesWithCoordinates(
        selectedDisease,
        startDate,
        endDate,
      );

      if (ignore) return;

      if (error) {
        console.error(error);
        setMapLoading(false);
        return;
      }

      if (success) {
        setHeatmapDiagnoses(success.diagnoses);
        setUnpinnedDiagnoses(success.unpinnedDiagnoses);
        setTotalDiagnosesCount(success.totalCount);
      }

      setMapLoading(false);
    };

    if (view === "district") {
      fetchDistrictData();
    } else {
      fetchCoordinatesData();
    }

    return () => {
      ignore = true;
    };
  }, [selectedDisease, startDate, endDate, view]);

  // District view stats (optimized with single pass iteration)
  const {
    totalCases,
    affectedDistrictsCount,
    highestCases,
    highestDistrict,
    averageCases,
  } = useMemo(() => {
    let totalCases = 0;
    let affectedDistrictsCount = 0;
    let highestCases = 0;
    let highestDistrict = "N/A";

    for (const [district, count] of Object.entries(casesData)) {
      totalCases += count;
      if (count > 0) {
        affectedDistrictsCount++;
      }
      if (count > highestCases) {
        highestCases = count;
        highestDistrict = district;
      }
    }

    const averageCases =
      affectedDistrictsCount > 0
        ? Math.round(totalCases / affectedDistrictsCount)
        : 0;

    return {
      totalCases,
      affectedDistrictsCount,
      highestCases,
      highestDistrict,
      averageCases,
    };
  }, [casesData]);

  // Coordinates view stats (removed useMemo for primitive O(1) ops)
  const pinnedCases = heatmapDiagnoses.length;
  const totalAllCases = totalDiagnosesCount;
  const unpinnedCases = totalAllCases - pinnedCases;
  const coveragePercent =
    totalAllCases > 0 ? Math.round((pinnedCases / totalAllCases) * 100) : 0;

  // Memoize modal diagnoses arrays to prevent recreation on every render
  const selectedFeatureDiagnoses = useMemo(() => {
    if (!selectedFeature) return [];
    return diagnoses.filter((d) => d.district === selectedFeature);
  }, [selectedFeature, diagnoses]);

  const coordinatesModalDiagnoses = useMemo(() => {
    if (coordinatesModal === "total") {
      return [...heatmapDiagnoses, ...unpinnedDiagnoses];
    }
    if (coordinatesModal === "pinned") {
      return heatmapDiagnoses;
    }
    if (coordinatesModal === "unpinned") {
      return unpinnedDiagnoses;
    }
    return [];
  }, [coordinatesModal, heatmapDiagnoses, unpinnedDiagnoses]);

  const isLoading = mapLoading || (view === "district" && (geoLoading || !geoData));

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-between sm:flex-row gap-4">
        <div className="space-x-2">
          <DiseaseSelect
            value={selectedDisease}
            onValueChange={setSelectedDisease}
          />
          <ViewSelect value={view} onValueChange={setView} />
        </div>
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
            {isLoading ? (
              <div className="rounded-xl overflow-hidden" aria-label="Loading map">
                <div className="skeleton h-[600px] w-full" />
              </div>
            ) : view === "district" ? (
              <ChoroplethMap
                geoData={geoData!}
                casesData={casesData}
                diagnoses={diagnoses}
                onFeatureClick={(name) => setSelectedFeature(name)}
              />
            ) : (
              <HeatmapMap diagnoses={heatmapDiagnoses} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton h-4 w-4" />
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="skeleton h-8 w-32 mb-2" />
                  <div className="skeleton h-3 w-40" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : view === "district" ? (
          Object.keys(casesData).length > 0 ? (
            <>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Cases
                  </CardTitle>
                  <Activity className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="text-2xl font-bold">
                    {totalCases.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    For the selected disease and period
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Most Affected Area
                  </CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div
                    className="text-2xl font-bold truncate"
                    title={highestDistrict}
                  >
                    {highestDistrict}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    With {highestCases.toLocaleString()} reported cases
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Affected Districts
                  </CardTitle>
                  <MapPin className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="text-2xl font-bold">
                    {affectedDistrictsCount.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Areas with at least 1 case
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Average Cases
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="text-2xl font-bold">
                    {averageCases.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Per affected district
                  </p>
                </CardContent>
              </Card>
            </>
          ) : null
        ) : (
          <>
            <Card
              className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30"
              onClick={() => setCoordinatesModal("total")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Cases
                </CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-2xl font-bold">
                  {totalAllCases.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  For the selected disease and period
                </p>
              </CardContent>
            </Card>

            <Card
              className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30"
              onClick={() => setCoordinatesModal("pinned")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pinned Cases
                </CardTitle>
                <MapPin className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-2xl font-bold">
                  {pinnedCases.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cases with recorded coordinates
                </p>
              </CardContent>
            </Card>

            <Card
              className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30"
              onClick={() => setCoordinatesModal("unpinned")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Unpinned Cases
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-2xl font-bold">
                  {unpinnedCases.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cases without location data
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Coverage
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-2xl font-bold">{coveragePercent}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Of cases have coordinates
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <Card className="relative overflow-hidden border">
            <div className="absolute inset-0 bg-base-100 opacity-90" />
            <CardHeader className="relative pb-2 flex flex-row items-center justify-between gap-4">
              <div className="skeleton h-6 w-48" />
              <div className="skeleton h-8 w-28" />
            </CardHeader>
            <CardContent className="relative pt-2">
              <div className="skeleton h-[220px] w-full" />
            </CardContent>
          </Card>
        ) : (
          <DiseaseTimelineChart
            diagnoses={view === "district" ? diagnoses : [...heatmapDiagnoses, ...unpinnedDiagnoses]}
            disease={selectedDisease}
          />
        )}
      </div>

      <FeaturePatientsModal
        isOpen={!!selectedFeature}
        onClose={() => setSelectedFeature(null)}
        featureName={selectedFeature ?? ""}
        diagnoses={selectedFeatureDiagnoses}
      />

      <FeaturePatientsModal
        isOpen={!!coordinatesModal}
        onClose={() => setCoordinatesModal(null)}
        featureName={
          coordinatesModal === "total"
            ? "All"
            : coordinatesModal === "pinned"
              ? "Pinned"
              : "Unpinned"
        }
        diagnoses={coordinatesModalDiagnoses}
      />
    </div>
  );
};

export default ByDiseaseTab;
