"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2 } from "lucide-react";
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
import { MapSkeleton, StatsSkeletonCards, TimelineSkeleton } from "./skeleton-loaders";
import AnomalyPatientsModal from "./anomaly-patients-modal";
import { AnomalyTimelineChart } from "../anomaly-timeline-chart";

const ChoroplethMap = dynamic(() => import("../map/choropleth-map"), {
  ssr: false,
});
const HeatmapMap = dynamic(() => import("../map/heatmap-map"), { ssr: false });

const DEFAULT_CONTAMINATION = 0.05;
const MIN_CONTAMINATION = 0.01;
const MAX_CONTAMINATION = 0.49;

const clampContamination = (val: number): number => {
  if (Number.isNaN(val)) return DEFAULT_CONTAMINATION;
  if (val < MIN_CONTAMINATION) return MIN_CONTAMINATION;
  if (val > MAX_CONTAMINATION) return MAX_CONTAMINATION;
  return val;
};

const ByAnomalyTab = () => {
  const { selectedDisease, setSelectedDisease } = useSelectedDiseaseStore();
  const { startDate, endDate, setStartDate, setEndDate } = useDateRangeStore();

  const [view, setView] = useState<"coordinates" | "district">("coordinates");
  const [contamination, setContamination] = useState(DEFAULT_CONTAMINATION);
  const [contaminationInput, setContaminationInput] = useState(
    String(DEFAULT_CONTAMINATION),
  );

  // Modal state: null = closed, "total" for coords view,
  // a district name string for district view
  const [coordinatesModal, setCoordinatesModal] = useState<"total" | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  const { geoData, loading: geoLoading, error: geoError } = useGeoJsonData(
    "/geojson/bagong_silangan.geojson",
  );

  const { anomalyData, loading, error } = useAnomalyData({
    contamination,
    disease: selectedDisease,
    startDate,
    endDate,
  });

  // Derive anomalies array (already filtered by disease on the backend)
  const anomalies: SurveillanceAnomaly[] = anomalyData?.anomalies ?? [];

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
    if (coordinatesModal === "total") return anomalies;
    return [];
  }, [coordinatesModal, anomalies]);

  const districtModalAnomalies = useMemo<SurveillanceAnomaly[]>(() => {
    if (!selectedDistrict) return [];
    return anomalies.filter((a) => a.district === selectedDistrict);
  }, [selectedDistrict, anomalies]);

  // ─── Disease colour for timeline chart ───────────────────────────────────────

  const diseaseColor = useMemo(
    () => getDiseaseColorScale(selectedDisease as DiseaseType)(70).hex(),
    [selectedDisease],
  );

  // ─── Contamination form ───────────────────────────────────────────────────────

  const onSubmitContamination = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const next = clampContamination(parseFloat(contaminationInput));
      setContamination(next);
      setContaminationInput(String(next));
    },
    [contaminationInput],
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

  const isMapLoading = loading || (view === "district" && (geoLoading || !geoData));

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="card card-body bg-base-100 border-base-300 border">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <DiseaseSelect
                  value={selectedDisease}
                  onValueChange={setSelectedDisease}
                />
                <ViewSelect value={view} onValueChange={setView} />
                <DateRangeFilter
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                />
              </div>

              <form onSubmit={onSubmitContamination} className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    htmlFor="anomaly-contamination"
                    className="text-xs"
                  >
                    Contamination rate:
                  </label>
                  <Input
                    id="anomaly-contamination"
                    type="number"
                    className="input h-7 w-24 text-xs font-medium"
                    min={MIN_CONTAMINATION}
                    max={MAX_CONTAMINATION}
                    step={0.01}
                    value={contaminationInput}
                    onChange={(e) => setContaminationInput(e.target.value)}
                    disabled={loading}
                  />
                  <span className="text-muted text-xs font-normal flex items-center gap-1.5">
                    {loading ? (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        Detecting anomalies...
                      </>
                    ) : (
                      <>Range: {MIN_CONTAMINATION}–{MAX_CONTAMINATION}</>
                    )}
                  </span>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-sm w-fit"
                  disabled={loading}
                >
                  {loading ? "Applying..." : "Apply"}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-1 text-right">
            <div className="text-4xl font-semibold tracking-tight tabular-nums text-primary">
              {anomalyData?.anomaly_count?.toLocaleString() ?? "N/A"}
            </div>
            <div className="text-muted text-sm font-medium">Anomalies</div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {!loading && (error || geoError) ? (
        <Card className="col-span-2 border-red-200/50 bg-red-50/50">
          <CardHeader className="py-12 text-center">
            <div className="mx-auto w-fit rounded-[12px] bg-red-100 p-3">
              <AlertCircle className="size-8 text-red-700" />
            </div>
            <CardTitle className="mt-4 text-red-700">
              Error Loading Anomaly Data
            </CardTitle>
            <p className="text-red-600 text-sm">{error || geoError}</p>
          </CardHeader>
        </Card>
      ) : null}

      {/* Map */}
      <div>
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
              <HeatmapMap diagnoses={pinnedAnomalies} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
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
            />
          ) : null
        ) : (
          <AnomalyCoordinatesStatsCards
            totalAnomalies={anomalies.length}
            outbreakAlert={anomalyData?.outbreak_alert ?? false}
            contaminationRate={anomalyData?.contamination ?? contamination}
            uniqueLocations={uniqueLocations}
            onTotalClick={() => setCoordinatesModal("total")}
          />
        )}
      </div>

      {/* Timeline */}
      <div className="mt-6">
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
        title={`${selectedDistrict ?? ""} — Anomalies`}
        anomalies={districtModalAnomalies}
      />

      {/* Coordinates modal */}
      <AnomalyPatientsModal
        isOpen={!!coordinatesModal}
        onClose={handleCloseCoordinatesModal}
        title="All Anomalies"
        anomalies={coordinatesModalAnomalies}
      />
    </div>
  );
};

export default ByAnomalyTab;
