"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { DiseaseSelect } from "../disease-select";
import { DateRangeFilter } from "../date-range-filter";
import ViewSelect from "../view-select";
import useSelectedDiseaseStore from "@/stores/use-selected-disease-store";
import useDateRangeStore from "@/stores/use-date-range-store";
import { useAnomalyData } from "@/hooks/map-hooks/use-anomaly-data";
import { useGeoJsonData } from "@/hooks/map-hooks/use-geojson-data";
import type { SurveillanceAnomaly } from "@/types";
import { getDiseaseColorScale } from "@/utils/map-helpers";
import type { DiseaseType } from "@/stores/use-selected-disease-store";
import {
  AnomalyDistrictStatsCards,
  AnomalyCoordinatesStatsCards,
} from "./anomaly-stats-cards";
import {
  MapSkeleton,
  StatsSkeletonCards,
  TimelineSkeleton,
  AnomalySummarySkeleton,
} from "./skeleton-loaders";
import AnomalyPatientsModal from "./anomaly-patients-modal";
import { AnomalyTimelineChart } from "../anomaly-timeline-chart";
import AnomalySummary from "./anomaly-summary";
import { getSurveillanceExportData, type SurveillanceExportData } from "@/utils/report-export";
import { ExportReportButton } from "@/components/ui/export-report-button";
import { PdfImage } from "@/utils/pdf-export";
import { useCurrentUser } from "@/hooks/use-current-user";

const ChoroplethMap = dynamic(() => import("../map/choropleth-map"), {
  ssr: false,
});
const HeatmapMap = dynamic(() => import("../map/heatmap-map"), { ssr: false });

const ByAnomalyTab = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { selectedDisease, setSelectedDisease } = useSelectedDiseaseStore();
  const { startDate, endDate, setStartDate, setEndDate } = useDateRangeStore();

  const [view, setView] = useState<"coordinates" | "district">("coordinates");
  const [showInfo, setShowInfo] = useState(false);
  const generatedBy = useCurrentUser();

  // Modal state:
  //   coordinatesModal — "anomalies" | "normal" | null
  //   selectedDistrict — district name string for district view modal
  //   districtModal — "total" | "mostAffected" | "affectedDistricts" | null
  const [coordinatesModal, setCoordinatesModal] = useState<
    "anomalies" | "normal" | null
  >(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [districtModal, setDistrictModal] = useState<
    "total" | "mostAffected" | "affectedDistricts" | null
  >(null);

  const {
    geoData,
    loading: geoLoading,
    error: geoError,
  } = useGeoJsonData("/geojson/bagong_silangan.geojson");

  // The backend runs per-disease Isolation Forest models and returns all
  // results. Disease filtering is applied client-side via useMemo below.
  // Contamination is fixed at 0.05 (5%) - see documentation for rationale.
  const { anomalyData, loading, error, refetch } = useAnomalyData({
    contamination: 0.05,
    startDate,
    endDate,
  });

  const handleRescan = useCallback(() => {
    refetch({ forceRefresh: true });
  }, [refetch]);

  // Separate anomaly and normal lists, then filter client-side by disease
  const allAnomalies: SurveillanceAnomaly[] = anomalyData?.anomalies ?? [];
  const allNormalDiagnoses: SurveillanceAnomaly[] =
    anomalyData?.normal_diagnoses ?? [];

  const anomalies: SurveillanceAnomaly[] = useMemo(
    () =>
      selectedDisease === "all"
        ? allAnomalies
        : allAnomalies.filter(
            (a) => a.disease.toLowerCase() === selectedDisease.toLowerCase(),
          ),
    [allAnomalies, selectedDisease],
  );

  const normalDiagnoses: SurveillanceAnomaly[] = useMemo(
    () =>
      selectedDisease === "all"
        ? allNormalDiagnoses
        : allNormalDiagnoses.filter(
            (a) => a.disease.toLowerCase() === selectedDisease.toLowerCase(),
          ),
    [allNormalDiagnoses, selectedDisease],
  );

  // ─── District view derived data ─────────────────────────────────────────────

  const districtCasesData = useMemo(() => {
    return anomalies.reduce(
      (acc, a) => {
        if (a.district) {
          acc[a.district] = (acc[a.district] ?? 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [anomalies]);

  const districtStats = useMemo(() => {
    let totalAnomalies = 0;
    let affectedDistrictsCount = 0;
    let highestCount = 0;
    let highestDistrict = "N/A";

    for (const [district, count] of Object.entries(districtCasesData)) {
      totalAnomalies += count;
      if (count > 0) affectedDistrictsCount++;
      if (count > highestCount) {
        highestCount = count;
        highestDistrict = district;
      }
    }

    const averageAnomalies =
      affectedDistrictsCount > 0
        ? Math.round(totalAnomalies / affectedDistrictsCount)
        : 0;

    return {
      totalAnomalies,
      affectedDistrictsCount,
      highestCount,
      highestDistrict,
      averageAnomalies,
    };
  }, [districtCasesData]);

  // ─── Coordinates view derived data ──────────────────────────────────────────

  const pinnedAnomalies = useMemo(
    () => anomalies.filter((a) => a.latitude != null && a.longitude != null),
    [anomalies],
  );

  const uniqueLocations = useMemo(() => {
    const seen = new Set<string>();
    for (const a of pinnedAnomalies) {
      seen.add(`${a.latitude},${a.longitude}`);
    }
    return seen.size;
  }, [pinnedAnomalies]);

  // ─── Modal data ──────────────────────────────────────────────────────────────

  const coordinatesModalAnomalies = useMemo<SurveillanceAnomaly[]>(() => {
    if (coordinatesModal === "anomalies") return anomalies;
    if (coordinatesModal === "normal") return normalDiagnoses;
    return [];
  }, [coordinatesModal, anomalies, normalDiagnoses]);

  const coordinatesModalTitle = useMemo(() => {
    if (coordinatesModal === "anomalies") return "All Flagged Cases";
    if (coordinatesModal === "normal") return "All Typical Cases";
    return "";
  }, [coordinatesModal]);

  const districtModalAnomalies = useMemo<SurveillanceAnomaly[]>(() => {
    if (!selectedDistrict) return [];
    return anomalies.filter((a) => a.district === selectedDistrict);
  }, [selectedDistrict, anomalies]);

  // ─── District stats modal data ───────────────────────────────────────────────

  const districtStatsModalAnomalies = useMemo<SurveillanceAnomaly[]>(() => {
    if (!districtModal) return [];
    if (districtModal === "total") return anomalies;
    if (districtModal === "mostAffected") {
      return anomalies.filter(
        (a) => a.district === districtStats.highestDistrict,
      );
    }
    if (districtModal === "affectedDistricts") {
      const affectedDistricts = Object.keys(districtCasesData);
      return anomalies.filter(
        (a) => a.district && affectedDistricts.includes(a.district),
      );
    }
    return [];
  }, [
    districtModal,
    anomalies,
    districtStats.highestDistrict,
    districtCasesData,
  ]);

  const districtStatsModalTitle = useMemo(() => {
    if (!districtModal) return "";
    if (districtModal === "total") return "All Flagged Cases";
    if (districtModal === "mostAffected")
      return `${districtStats.highestDistrict} — Flagged Cases`;
    if (districtModal === "affectedDistricts")
      return "Affected Districts — Flagged Cases";
    return "";
  }, [districtModal, districtStats.highestDistrict]);

  // ─── Disease colour for timeline chart ───────────────────────────────────────

  const diseaseColor = useMemo(
    () => getDiseaseColorScale(selectedDisease as DiseaseType)(70).hex(),
    [selectedDisease],
  );

  const handleFeatureClick = useCallback((name: string) => {
    setSelectedDistrict(name);
  }, []);

  const handleCloseDistrictModal = useCallback(() => {
    setSelectedDistrict(null);
  }, []);

  const handleCloseCoordinatesModal = useCallback(() => {
    setCoordinatesModal(null);
  }, []);

  const handleCloseDistrictStatsModal = useCallback(() => {
    setDistrictModal(null);
  }, []);

  const handleDiseaseChange = (disease: DiseaseType) => {
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

  const isMapLoading =
    loading || (view === "district" && (geoLoading || !geoData));

  const captureImages = async () => {
    const domtoimage = (await import('dom-to-image-more')).default;
    const images: PdfImage[] = [];

    // Suppress console errors during capture
    const originalConsoleError = console.error;
    console.error = () => {};

    // Temporary style injection to fix Leaflet tile gaps and hide UI outlines
    const style = document.createElement('style');
    style.id = 'pdf-export-style-overrides-anomaly';
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
      // Capture map
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
          title: 'Anomaly Surveillance Map',
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
          title: 'Anomaly Timeline Chart',
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
      ? districtStats
      : {
          totalAnomalies: anomalies.length,
          normalDiagnosesCount: normalDiagnoses.length,
          uniqueLocations,
        };

    const additionalData: Record<string, unknown> = {
      anomalies: anomalies.map(a => ({
        id: a.id,
        disease: a.disease,
        district: a.district,
        latitude: a.latitude,
        longitude: a.longitude,
        createdAt: a.createdAt,
        anomaly_score: a.anomaly_score,
      })),
      normal: normalDiagnoses.map(n => ({
        id: n.id,
        disease: n.disease,
        district: n.district,
        latitude: n.latitude,
        longitude: n.longitude,
        createdAt: n.createdAt,
      })),
    };

    const exportData: SurveillanceExportData = {
      tab: "by-anomaly",
      disease: selectedDisease,
      view,
      dateRange: { start: startDate, end: endDate },
      stats,
      additionalData,
    };

    return getSurveillanceExportData(exportData);
  }, [view, districtStats, anomalies, normalDiagnoses, uniqueLocations, selectedDisease, startDate, endDate]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col items-start justify-between lg:flex-row gap-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <DiseaseSelect
            value={selectedDisease}
            onValueChange={handleDiseaseChange}
          />
          <ViewSelect value={view} onValueChange={setView} />
        </div>
        <div  className="flex gap-2">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
          />
          <button
            type="button"
            className="btn border-border"
            onClick={handleRescan}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="size-4" />
                Refresh Analysis
              </>
            )}
          </button>
          <ExportReportButton
            data={exportInfo.data}
            columns={exportInfo.columns}
            filenameSlug={exportInfo.filenameSlug}
            title={exportInfo.title}
            subtitle={exportInfo.subtitle}
            disabled={loading}
            images={captureImages}
            generatedBy={generatedBy}
            context="ALERT_ANOMALIES"
          />
        </div>
      </div>

      {/* What This Means info card */}
      <Card className="border-dashed">
        <button
          type="button"
          className="w-full flex items-center justify-between p-4 transition-colors"
          onClick={() => setShowInfo(!showInfo)}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <HelpCircle className="size-4 text-muted-foreground" />
            How are cases flagged?
          </div>
          {showInfo ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </button>
        {showInfo && (
          <div className="px-4 pb-4 text-sm text-base-content/80 space-y-2 border-t border-dashed pt-3">
            <p>
              This analysis automatically reviews all verified diagnosis records and flags cases 
              that show unusual patterns. A case may be flagged for several reasons:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Unusual location</strong> — This disease is rarely reported in this area</li>
              <li><strong>Unusual timing</strong> — This case occurred at an unusual time of year</li>
              <li><strong>Unusual age</strong> — The patient&apos;s age is atypical for this diagnosis</li>
              <li><strong>Unusual gender</strong> — The patient&apos;s gender is uncommon for this diagnosis</li>
              <li><strong>Multiple factors</strong> — Two or more reasons applied simultaneously</li>
            </ul>
            <p className="text-base-content/70">
              Flagged cases do not mean the diagnosis is incorrect — they indicate patterns worth 
              reviewing for public health surveillance. Approximately 5% of cases are expected to be 
              flagged by design.
            </p>
          </div>
        )}
      </Card>

      {/* Error state */}
      {!loading && (error || geoError) ? (
        <Card className="col-span-2 border-red-200/50 bg-red-50/50">
          <CardHeader className="py-12 text-center">
            <div className="mx-auto w-fit rounded-[12px] bg-red-100 p-3">
              <AlertCircle className="size-8 text-red-700" />
            </div>
            <CardTitle className="mt-4 text-red-700">
              Error Loading Flagged Cases Data
            </CardTitle>
            <p className="text-red-600 text-sm">{error || geoError}</p>
          </CardHeader>
        </Card>
      ) : null}

      {/* Map */}
      <div data-surveillance-map suppressHydrationWarning>
        <Card>
          <CardContent className="p-8">
            {isMapLoading ? (
              <MapSkeleton />
            ) : view === "district" ? (
              <ChoroplethMap
                geoData={geoData!}
                casesData={districtCasesData}
                diagnoses={[] as any}
                onFeatureClick={handleFeatureClick}
              />
            ) : (
              <HeatmapMap
                diagnoses={pinnedAnomalies}
                showReasons
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats cards */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${view === "district" ? "4" : "3"} gap-6 mt-6`}
      >
        {loading ? (
          <StatsSkeletonCards />
        ) : view === "district" ? (
          Object.keys(districtCasesData).length > 0 ? (
            <AnomalyDistrictStatsCards
              totalAnomalies={districtStats.totalAnomalies}
              highestDistrict={districtStats.highestDistrict}
              highestCount={districtStats.highestCount}
              affectedDistrictsCount={districtStats.affectedDistrictsCount}
              averageAnomalies={districtStats.averageAnomalies}
              onTotalClick={() => setDistrictModal("total")}
              onMostAffectedClick={() => setDistrictModal("mostAffected")}
              onAffectedDistrictsClick={() =>
                setDistrictModal("affectedDistricts")
              }
            />
          ) : null
        ) : (
          <AnomalyCoordinatesStatsCards
            totalAnomalies={anomalies.length}
            normalDiagnosesCount={normalDiagnoses.length}
            uniqueLocations={uniqueLocations}
            onTotalClick={() => setCoordinatesModal("anomalies")}
            onNormalClick={() => setCoordinatesModal("normal")}
          />
        )}
      </div>

      {/* Anomaly Summary */}
      <div className="mt-6">
        {loading ? (
          <AnomalySummarySkeleton />
        ) : (
          <AnomalySummary
            anomalies={anomalies}
            selectedDisease={selectedDisease}
          />
        )}
      </div>

      {/* Timeline */}
      <div className="mt-6" data-surveillance-chart suppressHydrationWarning>
        {loading ? (
          <TimelineSkeleton />
        ) : (
          <AnomalyTimelineChart
            anomalies={anomalies}
            disease={selectedDisease}
            diseaseColor={diseaseColor}
          />
        )}
      </div>

      {/* District modal */}
      <AnomalyPatientsModal
        isOpen={!!selectedDistrict}
        onClose={handleCloseDistrictModal}
        title={`${selectedDistrict ?? ""} — Flagged Cases`}
        anomalies={districtModalAnomalies}
        isAnomaly={true}
      />

      {/* District stats modal — for total, most affected, and affected districts */}
      <AnomalyPatientsModal
        isOpen={!!districtModal}
        onClose={handleCloseDistrictStatsModal}
        title={districtStatsModalTitle}
        anomalies={districtStatsModalAnomalies}
        isAnomaly={true}
      />

      {/* Coordinates modal — shared for both anomalies and normal diagnoses */}
      <AnomalyPatientsModal
        isOpen={!!coordinatesModal}
        onClose={handleCloseCoordinatesModal}
        title={coordinatesModalTitle}
        anomalies={coordinatesModalAnomalies}
        isAnomaly={coordinatesModal === "anomalies"}
      />
    </div>
  );
};

export default ByAnomalyTab;
