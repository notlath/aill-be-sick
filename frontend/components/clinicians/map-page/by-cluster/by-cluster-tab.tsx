"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangeFilter } from "../date-range-filter";
import useDateRangeStore from "@/stores/use-date-range-store";
import { getClusterBaseColor } from "@/utils/cluster-colors";
import { buildClusterLegendBins, type ClusterLegendBin } from "@/utils/cluster-heatmap";
import PatientsModal from "../patients-modal";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Loader2,
  Activity,
  MapPin,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import ViewSelect from "../view-select";
import SelectedClusterSummary from "./selected-cluster-summary";
import { IllnessClusterTimelineChart } from "./illness-cluster-timeline-chart";
import { useIllnessClusterData } from "../../../../hooks/illness-cluster-hooks/use-illness-cluster-data";
import { useIllnessClusterRecommendation } from "../../../../hooks/illness-cluster-hooks/use-illness-cluster-recommendation";
import { useClusterDisplay } from "../../../../hooks/illness-cluster-hooks/use-cluster-display";
import { useGeoJsonData } from "../../../../hooks/map-hooks/use-geojson-data";

const ClusterChoroplethMap = dynamic(
  () => import("../map/cluster-choropleth-map"),
  { ssr: false },
);
const HeatmapMap = dynamic(() => import("../map/heatmap-map"), { ssr: false });

type ClusterVariableSelection = {
  age: boolean;
  gender: boolean;
  district: boolean;
  time: boolean;
};

const DEFAULT_SELECTED_VARIABLES: ClusterVariableSelection = {
  age: true,
  gender: true,
  district: true,
  time: false,
};

const DEFAULT_K = 4;

const ByClusterTab = () => {
  const { startDate, endDate, setStartDate, setEndDate } = useDateRangeStore();
  const { geoData, loading: geoLoading, error: geoError } = useGeoJsonData(
    "/geojson/bagong_silangan.geojson",
  );
  const [k, setK] = useState<number>(DEFAULT_K);
  const [kInput, setKInput] = useState<string>(String(DEFAULT_K));
  const [selectedVariables, setSelectedVariables] =
    useState<ClusterVariableSelection>(DEFAULT_SELECTED_VARIABLES);
  const [appliedVariables, setAppliedVariables] =
    useState<ClusterVariableSelection>(DEFAULT_SELECTED_VARIABLES);
  const { recommendedK, loading: loadingRecommendation, message: recommendationMessage } =
    useIllnessClusterRecommendation({
      variables: selectedVariables,
      startDate,
      endDate,
    });
  const [selectedClusterDisplay, setSelectedClusterDisplay] = useState<string>("1");
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [pendingK, setPendingK] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<"coordinates" | "district">("coordinates");
  const [coordinatesModal, setCoordinatesModal] = useState<"total" | "pinned" | "unpinned" | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const clampK = (val: number) => {
    if (Number.isNaN(val)) return k;
    if (val < 2) return 2;
    if (val > 25) return 25;
    return val;
  };

  const { clusterData, loading, error } = useIllnessClusterData({
    k,
    variables: appliedVariables,
    startDate,
    endDate,
  });

  useEffect(() => {
    if (recommendedK) {
      setKInput(String(recommendedK));
    }
  }, [recommendedK]);

  const handleVariableChange = (variable: keyof ClusterVariableSelection) => {
    const selectedCount = Object.values(selectedVariables).filter(Boolean).length;

    if (selectedVariables[variable] && selectedCount === 1) {
      return;
    }

    setSelectedVariables((prev) => ({
      ...prev,
      [variable]: !prev[variable],
    }));
  };

  const onSubmitK = (e: React.FormEvent) => {
    e.preventDefault();
    const nextK = clampK(parseInt(kInput, 10));

    if (loadingRecommendation) {
      setPendingK(nextK);
      setShowConfirmModal(true);
      return;
    }

    applyClusteringWithK(nextK);
  };

  const applyClusteringWithK = (clusterCount: number) => {
    const nextK = clampK(clusterCount);
    const nextVariables = { ...selectedVariables };

    setK(nextK);
    setKInput(String(nextK));
    setAppliedVariables(nextVariables);
  };

  const handleConfirmModal = () => {
    if (pendingK !== null) {
      applyClusteringWithK(pendingK);
    }
    setShowConfirmModal(false);
    setPendingK(null);
  };

  const handleCancelModal = () => {
    setShowConfirmModal(false);
    setPendingK(null);
  };

  const {
    clusterDisplayOptions,
    selectedClusterIndex,
    selectedClusterId,
    selectedClusterLabel,
  } = useClusterDisplay(
    clusterData,
    selectedClusterDisplay,
    setSelectedClusterDisplay,
  );

  const filteredIllnesses = useMemo(() => {
    return (clusterData?.illnesses || []).filter(
      (illness) => illness.cluster === selectedClusterId,
    );
  }, [clusterData, selectedClusterId]);

  const casesData = useMemo(() => {
    return filteredIllnesses.reduce((acc, illness) => {
      if (illness.district) {
        acc[illness.district] = (acc[illness.district] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
  }, [filteredIllnesses]);

  const clusterColorIndex = selectedClusterIndex;
  const clusterBaseColor = useMemo(
    () => getClusterBaseColor(clusterColorIndex),
    [clusterColorIndex],
  );

  const legendResult = useMemo(() => {
    return buildClusterLegendBins(Object.values(casesData), clusterBaseColor);
  }, [casesData, clusterBaseColor]);

  const legendBins = legendResult.bins as ClusterLegendBin[];
  const legendTitle = `Group ${selectedClusterLabel} Legend`;

  const selectedDistrictPatients = useMemo(() => {
    if (!selectedFeature) return [];
    return filteredIllnesses.filter(
      (illness) => illness.district === selectedFeature,
    );
  }, [filteredIllnesses, selectedFeature]);

  const { pinnedCases, totalAllCases, unpinnedCases, coveragePercent } = useMemo(() => {
    const totalAllCases = filteredIllnesses.length;
    let pinnedCases = 0;
    for (let i = 0; i < totalAllCases; i++) {
      if (filteredIllnesses[i].latitude != null && filteredIllnesses[i].longitude != null) {
        pinnedCases++;
      }
    }
    const unpinnedCases = totalAllCases - pinnedCases;
    const coveragePercent = totalAllCases > 0 ? Math.round((pinnedCases / totalAllCases) * 100) : 0;
    return { pinnedCases, totalAllCases, unpinnedCases, coveragePercent };
  }, [filteredIllnesses]);

  const coordinatesModalPatients = useMemo(() => {
    if (coordinatesModal === "total") return filteredIllnesses;
    if (coordinatesModal === "pinned") return filteredIllnesses.filter(d => d.latitude != null && d.longitude != null);
    if (coordinatesModal === "unpinned") return filteredIllnesses.filter(d => d.latitude == null || d.longitude == null);
    return [];
  }, [coordinatesModal, filteredIllnesses]);

  const isMapLoading = geoLoading || loading;

  const modalRoot = isMounted ? document.body : null;
  const confirmModal = (
    <div className={`modal ${showConfirmModal ? "modal-open" : ""}`}>
      <div className="modal-box">
        <h3 className="text-lg font-semibold">Confirm Group Settings</h3>
        <p className="text-base-content/80 py-4 text-sm">
          You&apos;re about to create{" "}
          <span className="font-semibold">{pendingK}</span> groups, but the
          recommended number is still{" "}
          <span className="font-semibold">being calculated</span>. Do you want
          to continue?
        </p>
        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleConfirmModal}
          >
            Proceed
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleCancelModal}
          >
            Cancel
          </button>
        </div>
      </div>
      <form
        method="dialog"
        className="modal-backdrop"
        onClick={handleCancelModal}
      >
        <button>close</button>
      </form>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="card card-body bg-base-100 border-base-300 border">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Select variables</h2>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3">
                <label
                  className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.age ? "btn-primary btn-soft" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedVariables.age}
                    onChange={() => handleVariableChange("age")}
                  />
                  <span>Patient age</span>
                </label>
                <label
                  className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.gender ? "btn-primary btn-soft" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedVariables.gender}
                    onChange={() => handleVariableChange("gender")}
                  />
                  <span>Patient gender</span>
                </label>
                <label
                  className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.time ? "btn-primary btn-soft" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedVariables.time}
                    onChange={() => handleVariableChange("time")}
                  />
                  <span>Date of diagnosis (seasonal)</span>
                </label>
              </div>

              <div className="border-l border-base-300 h-8" />

              <div className="flex items-center gap-3">
                <label
                  className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.district ? "btn-primary btn-soft" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedVariables.district}
                    onChange={() => handleVariableChange("district")}
                  />
                  <span>District</span>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <ViewSelect value={view} onValueChange={setView} />
                <DateRangeFilter
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                />
              </div>

              <form onSubmit={onSubmitK} className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label htmlFor="illness-cluster-map-k" className="text-xs">
                    Groups:
                  </label>
                  <Input
                    id="illness-cluster-map-k"
                    type="number"
                    className="input h-7 w-17 text-xs font-medium"
                    min={2}
                    max={25}
                    value={kInput}
                    onChange={(e) => setKInput(e.target.value)}
                    disabled={loading}
                  />

                  <span className="text-muted flex items-center gap-1.5 text-xs font-normal">
                    {loadingRecommendation ? (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        Calculating recommendation...
                      </>
                    ) : recommendedK ? (
                      <>Recommended: {recommendedK} groups</>
                    ) : (
                      <>Recommended: 2-25 groups</>
                    )}
                  </span>
                  {!loadingRecommendation && recommendationMessage ? (
                    <span className="text-warning text-xs font-medium">
                      {recommendationMessage}
                    </span>
                  ) : null}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-sm w-fit"
                  title="Apply group settings"
                  disabled={loading}
                >
                  {loading ? "Applying..." : "Apply"}
                </button>
              </form>
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="text-4xl font-semibold tracking-tight tabular-nums text-primary">
              {clusterData?.total_illnesses.toLocaleString() ?? "N/A"}
            </div>
            <div className="text-muted text-sm font-medium">Diagnoses</div>
          </div>
        </div>
      </div>

      {clusterDisplayOptions.length > 0 ? (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-base-content/70">
            Select group:
          </span>
          <Select
            className="w-auto"
            value={selectedClusterDisplay}
            onValueChange={(value) => setSelectedClusterDisplay(value)}
          >
            <SelectTrigger className="w-[260px] h-9">
              <SelectValue placeholder="Select group" />
            </SelectTrigger>
            <SelectContent>
              {clusterDisplayOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {!loading && (error || geoError) ? (
        <Card className="col-span-2 border-red-200/50 bg-red-50/50">
          <CardHeader className="py-12 text-center">
            <div className="mx-auto w-fit rounded-[12px] bg-red-100 p-3">
              <AlertCircle className="size-8 text-red-700" />
            </div>
            <CardTitle className="mt-4 text-red-700">
              Error Loading Cluster Data
            </CardTitle>
            <p className="text-red-600 text-sm">{error || geoError}</p>
          </CardHeader>
        </Card>
      ) : null}

      <div>
        <Card>
          <CardContent className="p-8">
            {isMapLoading || !geoData ? (
              <div className="rounded-xl overflow-hidden" aria-label="Loading map">
                <div className="skeleton h-[600px] w-full" />
              </div>
            ) : view === "district" ? (
              <ClusterChoroplethMap
                geoData={geoData}
                casesData={casesData}
                illnesses={filteredIllnesses}
                legendBins={legendBins}
                legendTitle={legendTitle}
                zeroColor={legendResult.zeroColor}
                onFeatureClick={(name) => setSelectedFeature(name)}
                selectedGroupLabel={selectedClusterLabel}
              />
            ) : (
              <HeatmapMap diagnoses={filteredIllnesses as any} />
            )}
          </CardContent>
        </Card>
      </div>

      {!loading && clusterData ? (
        view === "district" ? (
          <div className="space-y-6">
            {/* Added Selected Cluster Summary Span for district view */}
            {selectedClusterId !== null && clusterData?.cluster_statistics.find(s => s.cluster_id === selectedClusterId) && (
              <div className="mt-2">
                <SelectedClusterSummary
                  stat={clusterData.cluster_statistics.find(s => s.cluster_id === selectedClusterId)!}
                  clusterIndex={clusterColorIndex}
                  selectedVariables={appliedVariables}
                />
                {loading ? (
                  <div className="mt-4">
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
                  </div>
                ) : (
                  <div className="mt-4">
                    <IllnessClusterTimelineChart
                      illnesses={filteredIllnesses}
                      nClusters={k}
                      selectedCluster={selectedClusterId}
                      clusterColorIndex={clusterColorIndex}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
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
                  For the selected group and period
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

            {/* Added Selected Cluster Summary Span */}
            {selectedClusterId !== null && clusterData?.cluster_statistics.find(s => s.cluster_id === selectedClusterId) && (
              <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-2">
                <SelectedClusterSummary
                  stat={clusterData.cluster_statistics.find(s => s.cluster_id === selectedClusterId)!}
                  clusterIndex={clusterColorIndex}
                  selectedVariables={appliedVariables}
                />
                {loading ? (
                  <div className="mt-4">
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
                  </div>
                ) : (
                  <div className="mt-4">
                    <IllnessClusterTimelineChart
                      illnesses={filteredIllnesses}
                      nClusters={k}
                      selectedCluster={selectedClusterId}
                      clusterColorIndex={clusterColorIndex}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      ) : null}

      <PatientsModal
        isOpen={!!selectedFeature}
        onClose={() => setSelectedFeature(null)}
        patients={selectedDistrictPatients}
        clusterDisplay={selectedClusterLabel}
        title={`District ${selectedFeature ?? ""} — Group ${selectedClusterLabel}`}
        subtitle={`Showing ${selectedDistrictPatients.length} diagnosis record${selectedDistrictPatients.length !== 1 ? "s" : ""}`}
      />

      <PatientsModal
        isOpen={!!coordinatesModal}
        onClose={() => setCoordinatesModal(null)}
        patients={coordinatesModalPatients}
        clusterDisplay={selectedClusterLabel}
        title={
          coordinatesModal === "total"
            ? `All Cases — Group ${selectedClusterLabel}`
            : coordinatesModal === "pinned"
              ? `Pinned Cases — Group ${selectedClusterLabel}`
              : `Unpinned Cases — Group ${selectedClusterLabel}`
        }
        subtitle={`Showing ${coordinatesModalPatients.length} diagnosis record${coordinatesModalPatients.length !== 1 ? "s" : ""}`}
      />

      {modalRoot ? createPortal(confirmModal, modalRoot) : null}
    </div>
  );
};

export default ByClusterTab;
