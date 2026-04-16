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
import { getSurveillanceExportData, type SurveillanceExportData } from "@/utils/report-export";
import { format } from "date-fns";
import { ExportReportButton } from "@/components/ui/export-report-button";
import { PdfImage } from "@/utils/pdf-export";
import { useCurrentUser } from "@/hooks/use-current-user";

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
  const generatedBy = useCurrentUser();

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

  const captureImages = async () => {
    const domtoimage = (await import('dom-to-image-more')).default;
    const images: PdfImage[] = [];

    // Suppress console errors during capture
    const originalConsoleError = console.error;
    console.error = () => {};

    // Temporary style injection to fix Leaflet tile gaps and hide UI outlines
    const style = document.createElement('style');
    style.id = 'pdf-export-style-overrides';
    style.innerHTML = `
      /* Fix dom-to-image black border grid issue with Tailwind */
      * {
        border-color: transparent !important;
      }
      /* Fix Leaflet tile gaps by slightly over-sizing tiles */
      .leaflet-tile-container img {
        width: 256.5px !important;
        height: 256.5px !important;
        margin: -0.25px !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
      }
      /* Remove outlines and borders from map and chart containers */
      .leaflet-container, 
      .recharts-wrapper, 
      .card, 
      .card-content, 
      [data-surveillance-map], 
      [data-surveillance-chart] {
        border: none !important;
        box-shadow: none !important;
        outline: none !important;
        background-color: transparent !important;
      }
      /* Clean up Recharts grid lines */
      .recharts-cartesian-grid-horizontal line,
      .recharts-cartesian-grid-vertical line {
        stroke: #ebebe8 !important;
        stroke-opacity: 0.5 !important;
      }
      /* Hide map controls and attribution for cleaner export */
      .leaflet-control-container, .leaflet-control-attribution {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    const captureOptions = {
      quality: 0.95,
      bgcolor: '#f8f8f5', // Match base-100
      filter: (node: Node) => {
        if (node instanceof Element) {
          const tagName = node.tagName.toLowerCase();
          if (tagName === 'link' || tagName === 'script') return false;
        }
        return true;
      },
    };

    try {
      // Capture map - target the content area
      const mapElement = document.querySelector('[data-surveillance-map] .card-content') || 
                         document.querySelector('[data-surveillance-map]');
      
      if (mapElement) {
        const dataUrl = await domtoimage.toPng(mapElement as HTMLElement, captureOptions);
        const img = new Image();
        img.src = dataUrl;
        await new Promise(resolve => img.onload = resolve);
        images.push({
          dataUrl,
          width: img.width,
          height: img.height,
          title: 'Disease Surveillance Map',
        });
      }

      // Capture chart
      const chartElement = document.querySelector('[data-surveillance-chart] .card-content') || 
                           document.querySelector('[data-surveillance-chart]');
      
      if (chartElement) {
        const dataUrl = await domtoimage.toPng(chartElement as HTMLElement, captureOptions);
        const img = new Image();
        img.src = dataUrl;
        await new Promise(resolve => img.onload = resolve);
        images.push({
          dataUrl,
          width: img.width,
          height: img.height,
          title: 'Disease Timeline Chart',
        });
      }
    } finally {
      // Cleanup
      document.head.removeChild(style);
      console.error = originalConsoleError;
    }

    return images;
  };

  const exportInfo = useMemo(() => {
    const stats: Record<string, unknown> = view === "district"
      ? {
          totalCases,
          affectedDistrictsCount,
          highestCases,
          highestDistrict,
          averageCases,
        }
      : {
          totalAllCases,
          newestCaseDate: newestCaseDate?.toISOString(),
          uniquePatientsCount,
          casesThisWeek,
        };

    const mapData = view === "district"
      ? Object.entries(casesData).map(([district, cases]) => ({ district, cases }))
      : heatmapDiagnoses.map(d => ({
          id: d.id,
          disease: d.disease,
          district: d.district,
          latitude: d.latitude,
          longitude: d.longitude,
          createdAt: d.createdAt,
          confidence: d.confidence,
          uncertainty: d.uncertainty,
        }));

    const timelineAggregated = timelineDiagnoses.reduce((acc, d) => {
      const date = format(new Date(d.createdAt), "yyyy-MM-dd");
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const timelineData = Object.entries(timelineAggregated).map(([date, cases]) => ({ date, cases }));

    const exportData: SurveillanceExportData = {
      tab: "by-disease",
      disease: selectedDisease,
      view,
      dateRange: { start: startDate, end: endDate },
      stats,
      mapData,
      timelineData,
    };

    return getSurveillanceExportData(exportData);
  }, [
    totalCases,
    affectedDistrictsCount,
    highestCases,
    highestDistrict,
    averageCases,
    totalAllCases,
    newestCaseDate,
    uniquePatientsCount,
    casesThisWeek,
    view,
    casesData,
    heatmapDiagnoses,
    timelineDiagnoses,
    selectedDisease,
    startDate,
    endDate,
  ]);

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
        <div className="flex gap-2">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
          />
          <ExportReportButton
            data={exportInfo.data}
            columns={exportInfo.columns}
            filenameSlug={exportInfo.filenameSlug}
            title={exportInfo.title}
            subtitle={exportInfo.subtitle}
            disabled={isLoading}
            images={captureImages}
            generatedBy={generatedBy}
            context="SURVEILLANCE_DISEASE"
          />
        </div>
      </div>

      <div data-surveillance-map suppressHydrationWarning>
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

      <div className="mt-6" data-surveillance-chart suppressHydrationWarning>
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
