"use client";

import { DiseaseSelect } from "../disease-select";
import { DateRangeFilter } from "../date-range-filter";
import { Card, CardContent } from "@/components/ui/card";
import dynamic from "next/dynamic";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import useSelectedDiseaseStore from "@/stores/use-selected-disease-store";
import useDateRangeStore from "@/stores/use-date-range-store";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getDiseaseDiagnosesByDistricts,
  getDiagnosesWithCoordinates,
} from "@/utils/diagnosis";
import { Diagnosis } from "@/lib/generated/prisma";
import FeaturePatientsModal from "../map/feature-patients-modal";
import { useGeoJsonData } from "@/hooks/map-hooks/use-geojson-data";
import ViewSelect from "../view-select";
import { DiseaseTimelineChart } from "./disease-timeline-chart";
import {
  DistrictStatsCards,
  CoordinatesStatsCards,
} from "./disease-stats-cards";
import { StatsSkeletonCards, TimelineSkeleton } from "./skeleton-loaders";

const ChoroplethMap = dynamic(() => import("../map/choropleth-map"), {
  ssr: false,
});
const HeatmapMap = dynamic(() => import("../map/heatmap-map"), { ssr: false });

const ByDiseaseTab = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [view, setView] = useState<"coordinates" | "district">("coordinates");
  const { selectedDisease, setSelectedDisease } = useSelectedDiseaseStore();
  const { startDate, endDate, setStartDate, setEndDate } = useDateRangeStore();

  const handleDiseaseChange = (disease: any) => {
    setSelectedDisease(disease);
    clearMapParams();
  };

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    clearMapParams();
  };

  const handleEndDateChange = (date: string) => {
    setEndDate(date);
    clearMapParams();
  };

  const clearMapParams = () => {
    if (searchParams.has("lat") || searchParams.has("lng") || searchParams.has("disease")) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("lat");
      newParams.delete("lng");
      newParams.delete("disease");
      
      const newQuery = newParams.toString();
      const newHref = newQuery ? `${pathname}?${newQuery}` : pathname;
      router.replace(newHref, { scroll: false });
    }
  };

  // District view state
  const [casesData, setCasesData] = useState<Record<string, number>>({});
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);

  // Coordinates view state
  const [heatmapDiagnoses, setHeatmapDiagnoses] = useState<Diagnosis[]>([]);
  const [unpinnedDiagnoses, setUnpinnedDiagnoses] = useState<Diagnosis[]>([]);
  const [totalDiagnosesCount, setTotalDiagnosesCount] = useState(0);
  const [coordinatesModal, setCoordinatesModal] = useState<"total" | null>(
    null,
  );

  const [mapLoading, setMapLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const {
    geoData,
    loading: geoLoading,
    error: geoError,
  } = useGeoJsonData("/geojson/bagong_silangan.geojson");

  const handleFeatureClick = useCallback((name: string) => {
    setSelectedFeature(name);
  }, []);

  const handleCloseFeature = useCallback(() => {
    setSelectedFeature(null);
  }, []);

  const handleCoordinatesModalClose = useCallback(() => {
    setCoordinatesModal(null);
  }, []);

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

        const transformedData = grouped.reduce(
          (acc, item) => {
            if (item.district) {
              acc[item.district] = item._count.id;
            }
            return acc;
          },
          {} as Record<string, number>,
        );

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

  // District view stats (single pass iteration)
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

  // Coordinates view stats
  const { totalAllCases, newestCaseDate, uniquePatientsCount, casesThisWeek } =
    useMemo(() => {
      const allDiagnoses = [...heatmapDiagnoses, ...unpinnedDiagnoses];
      const totalAllCases = totalDiagnosesCount;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      let newestCaseDate: Date | null = null;
      const patientIds = new Set<number>();
      let casesThisWeek = 0;

      for (const d of allDiagnoses) {
        const date = new Date(d.createdAt);
        if (!newestCaseDate || date > newestCaseDate) {
          newestCaseDate = date;
        }
        if (d.userId) {
          patientIds.add(d.userId);
        }
        if (date >= sevenDaysAgo) {
          casesThisWeek++;
        }
      }

      const uniquePatientsCount = patientIds.size;

      return { totalAllCases, newestCaseDate, uniquePatientsCount, casesThisWeek };
    }, [heatmapDiagnoses, unpinnedDiagnoses, totalDiagnosesCount]);

  // Memoize modal diagnoses arrays to prevent recreation on every render
  const selectedFeatureDiagnoses = useMemo(() => {
    if (!selectedFeature) return [];
    return diagnoses.filter((d) => d.district === selectedFeature);
  }, [selectedFeature, diagnoses]);

  const coordinatesModalDiagnoses = useMemo(() => {
    if (coordinatesModal === "total") {
      return [...heatmapDiagnoses, ...unpinnedDiagnoses];
    }
    return [];
  }, [coordinatesModal, heatmapDiagnoses, unpinnedDiagnoses]);

  const timelineDiagnoses = useMemo(() => {
    return view === "district"
      ? diagnoses
      : [...heatmapDiagnoses, ...unpinnedDiagnoses];
  }, [view, diagnoses, heatmapDiagnoses, unpinnedDiagnoses]);

  const isLoading =
    mapLoading || (view === "district" && (geoLoading || !geoData));

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between lg:flex-row gap-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <DiseaseSelect
            value={selectedDisease}
            onValueChange={handleDiseaseChange}
          />
          <ViewSelect value={view} onValueChange={setView} />
        </div>
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
        />
      </div>

      <div>
        <Card>
          <CardContent className="p-8">
            {isLoading ? (
              <div
                className="rounded-xl overflow-hidden"
                aria-label="Loading map"
              >
                <div className="skeleton h-[600px] w-full" />
              </div>
            ) : view === "district" ? (
              <ChoroplethMap
                geoData={geoData!}
                casesData={casesData}
                diagnoses={diagnoses}
                onFeatureClick={handleFeatureClick}
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
          <StatsSkeletonCards />
        ) : view === "district" ? (
          Object.keys(casesData).length > 0 ? (
            <DistrictStatsCards
              totalCases={totalCases}
              highestDistrict={highestDistrict}
              highestCases={highestCases}
              affectedDistrictsCount={affectedDistrictsCount}
              averageCases={averageCases}
            />
          ) : null
        ) : (
          <CoordinatesStatsCards
            totalAllCases={totalAllCases}
            newestCaseDate={newestCaseDate}
            uniquePatientsCount={uniquePatientsCount}
            casesThisWeek={casesThisWeek}
            onTotalClick={() => setCoordinatesModal("total")}
          />
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <TimelineSkeleton />
        ) : (
          <DiseaseTimelineChart
            diagnoses={timelineDiagnoses}
            disease={selectedDisease}
          />
        )}
      </div>

      <FeaturePatientsModal
        isOpen={!!selectedFeature}
        onClose={handleCloseFeature}
        featureName={selectedFeature ?? ""}
        diagnoses={selectedFeatureDiagnoses}
      />

      <FeaturePatientsModal
        isOpen={!!coordinatesModal}
        onClose={handleCoordinatesModalClose}
        featureName="All"
        diagnoses={coordinatesModalDiagnoses}
      />
    </div>
  );
};

export default ByDiseaseTab;
