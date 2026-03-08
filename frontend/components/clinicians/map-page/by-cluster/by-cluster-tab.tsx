"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangeFilter } from "../date-range-filter";
import useDateRangeStore from "@/stores/use-date-range-store";
import useMapStore from "@/stores/use-map-store";
import { getClusterBaseColor } from "@/utils/cluster-colors";
import {
  buildClusterLegendBins,
  type ClusterLegendBin,
} from "@/utils/cluster-heatmap";
import PatientsModal from "../patients-modal";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import ViewSelect from "../view-select";
import SelectedClusterDetails from "./selected-cluster-details";
import StatisticsCards from "./statistics-cards";
import {
  MapSkeleton,
  StatsSkeletonCards,
  ClusterSelectSkeleton,
  ClusterDetailsSkeleton,
} from "./skeleton-loaders";
import { useIllnessClusterData } from "../../../../hooks/illness-cluster-hooks/use-illness-cluster-data";
import { useIllnessClusterRecommendation } from "../../../../hooks/illness-cluster-hooks/use-illness-cluster-recommendation";
import { useClusterDisplay } from "../../../../hooks/illness-cluster-hooks/use-cluster-display";
import { useGeoJsonData } from "../../../../hooks/map-hooks/use-geojson-data";
import {
  clampClusterCount,
  type ClusterVariableSelection,
} from "@/types/illness-cluster-settings";
import {
  parseIllnessClusterNavigationQuery,
  serializeIllnessClusterNavigationQuery,
} from "@/utils/illness-cluster-navigation";

const ClusterChoroplethMap = dynamic(
  () => import("../map/cluster-choropleth-map"),
  { ssr: false },
);
const HeatmapMap = dynamic(() => import("../map/heatmap-map"), { ssr: false });

const VARIABLE_LABELS: Record<keyof ClusterVariableSelection, string> = {
  age: "Age",
  gender: "Gender",
  district: "District",
  time: "Diagnosis date",
};

const toVariableLabelList = (variables: ClusterVariableSelection) =>
  (Object.keys(variables) as Array<keyof ClusterVariableSelection>)
    .filter((key) => variables[key])
    .map((key) => VARIABLE_LABELS[key]);

const formatReadableList = (items: string[]) => {
  if (items.length === 0) {
    return "your selected variables";
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

const ByClusterTab = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activeTab } = useMapStore();
  const { startDate, endDate, setStartDate, setEndDate } = useDateRangeStore();

  const initialNavigationStateRef = useRef<
    ReturnType<typeof parseIllnessClusterNavigationQuery> | undefined
  >(undefined);
  if (!initialNavigationStateRef.current) {
    initialNavigationStateRef.current =
      parseIllnessClusterNavigationQuery(searchParams);
  }
  const initialNavigationState = initialNavigationStateRef.current;

  const {
    geoData,
    loading: geoLoading,
    error: geoError,
  } = useGeoJsonData("/geojson/bagong_silangan.geojson");
  const [k, setK] = useState<number>(initialNavigationState.k);
  const [kInput, setKInput] = useState<string>(
    String(initialNavigationState.k),
  );
  const [selectedVariables, setSelectedVariables] =
    useState<ClusterVariableSelection>({ ...initialNavigationState.variables });
  const [appliedVariables, setAppliedVariables] =
    useState<ClusterVariableSelection>({ ...initialNavigationState.variables });
  const [selectedClusterDisplay, setSelectedClusterDisplay] = useState<string>(
    initialNavigationState.clusterDisplay,
  );
  const [hasHydratedUrlDates, setHasHydratedUrlDates] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [pendingK, setPendingK] = useState<number | null>(null);
  const [view, setView] = useState<"coordinates" | "district">("coordinates");
  const [coordinatesModal, setCoordinatesModal] = useState<
    "total" | "pinned" | "unpinned" | null
  >(null);

  const effectiveStartDate = hasHydratedUrlDates
    ? startDate
    : (initialNavigationState.startDate ?? startDate);
  const effectiveEndDate = hasHydratedUrlDates
    ? endDate
    : (initialNavigationState.endDate ?? endDate);

  useEffect(() => {
    if (hasHydratedUrlDates) {
      return;
    }

    if (initialNavigationState.startDate && initialNavigationState.endDate) {
      setStartDate(initialNavigationState.startDate);
      setEndDate(initialNavigationState.endDate);
    }

    setHasHydratedUrlDates(true);
  }, [
    hasHydratedUrlDates,
    initialNavigationState.endDate,
    initialNavigationState.startDate,
    setEndDate,
    setStartDate,
  ]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const clampK = (val: number) => {
    return clampClusterCount(val, k);
  };

  const {
    recommendedK,
    loading: loadingRecommendation,
    message: recommendationMessage,
  } = useIllnessClusterRecommendation({
    variables: selectedVariables,
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
  });

  const { clusterData, loading, error } = useIllnessClusterData({
    k,
    variables: appliedVariables,
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
  });

  useEffect(() => {
    if (recommendedK) {
      setKInput(String(recommendedK));
    }
  }, [recommendedK]);

  const handleVariableChange = useCallback(
    (variable: keyof ClusterVariableSelection) => {
      const selectedCount =
        Object.values(selectedVariables).filter(Boolean).length;

      if (selectedVariables[variable] && selectedCount === 1) {
        return;
      }

      setSelectedVariables((prev) => ({
        ...prev,
        [variable]: !prev[variable],
      }));
    },
    [selectedVariables],
  );

  const onSubmitK = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const nextK = clampK(parseInt(kInput, 10));

      if (loadingRecommendation) {
        setPendingK(nextK);
        setShowConfirmModal(true);
        return;
      }

      applyClusteringWithK(nextK);
    },
    [kInput, loadingRecommendation],
  );

  const applyClusteringWithK = useCallback(
    (clusterCount: number) => {
      const nextK = clampK(clusterCount);
      const nextVariables = { ...selectedVariables };

      setK(nextK);
      setKInput(String(nextK));
      setAppliedVariables(nextVariables);
    },
    [selectedVariables],
  );

  const handleConfirmModal = useCallback(() => {
    if (pendingK !== null) {
      applyClusteringWithK(pendingK);
    }
    setShowConfirmModal(false);
    setPendingK(null);
  }, [pendingK, applyClusteringWithK]);

  const handleCancelModal = useCallback(() => {
    setShowConfirmModal(false);
    setPendingK(null);
  }, []);

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

  const appliedVariableSummary = formatReadableList(
    toVariableLabelList(appliedVariables),
  );
  const hasPendingVariableChanges = (
    Object.keys(selectedVariables) as Array<keyof ClusterVariableSelection>
  ).some((key) => selectedVariables[key] !== appliedVariables[key]);

  useEffect(() => {
    if (activeTab !== "by-cluster") {
      return;
    }

    const nextQuery = serializeIllnessClusterNavigationQuery({
      tab: "by-cluster",
      clusterDisplay: selectedClusterDisplay,
      k,
      variables: appliedVariables,
      startDate: effectiveStartDate || undefined,
      endDate: effectiveEndDate || undefined,
    });

    if (nextQuery === searchParams.toString()) {
      return;
    }

    const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextHref, { scroll: false });
  }, [
    activeTab,
    appliedVariables,
    effectiveEndDate,
    effectiveStartDate,
    k,
    pathname,
    router,
    searchParams,
    selectedClusterDisplay,
  ]);

  const filteredIllnesses = useMemo(() => {
    return (clusterData?.illnesses || []).filter(
      (illness) => illness.cluster === selectedClusterId,
    );
  }, [clusterData, selectedClusterId]);

  const casesData = useMemo(() => {
    return filteredIllnesses.reduce(
      (acc, illness) => {
        if (illness.district) {
          acc[illness.district] = (acc[illness.district] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );
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

  const { pinnedCases, totalAllCases, unpinnedCases, coveragePercent } =
    useMemo(() => {
      const totalAllCases = filteredIllnesses.length;
      const pinnedIllnesses = filteredIllnesses.filter(
        (illness) => illness.latitude != null && illness.longitude != null,
      );
      const pinnedCases = pinnedIllnesses.length;
      const unpinnedCases = totalAllCases - pinnedCases;
      const coveragePercent =
        totalAllCases > 0 ? Math.round((pinnedCases / totalAllCases) * 100) : 0;
      return { pinnedCases, totalAllCases, unpinnedCases, coveragePercent };
    }, [filteredIllnesses]);

  const coordinatesModalPatients = useMemo(() => {
    if (coordinatesModal === "total") return filteredIllnesses;
    if (coordinatesModal === "pinned")
      return filteredIllnesses.filter(
        (d) => d.latitude != null && d.longitude != null,
      );
    if (coordinatesModal === "unpinned")
      return filteredIllnesses.filter(
        (d) => d.latitude == null || d.longitude == null,
      );
    return [];
  }, [coordinatesModal, filteredIllnesses]);

  const selectedClusterStat = useMemo(() => {
    if (selectedClusterId === null || !clusterData) return null;
    return (
      clusterData.cluster_statistics.find(
        (s) => s.cluster_id === selectedClusterId,
      ) ?? null
    );
  }, [clusterData, selectedClusterId]);

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
                  <span>Age</span>
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
                  <span>Gender</span>
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
                  <span>Diagnosis date</span>
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
                  startDate={effectiveStartDate}
                  endDate={effectiveEndDate}
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

                <div className="text-muted text-xs font-normal">
                  <span>
                    These groups are currently based on{" "}
                    <span className="font-medium">
                      {appliedVariableSummary}
                    </span>
                    . Patients with similar details in these areas are placed in
                    the same group
                  </span>
                  {hasPendingVariableChanges ? (
                    <span className="block mt-1">
                      The groups have not been updated. Click Apply to rebuild
                      the groups using the new variable picks
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

      {loading ? (
        <ClusterSelectSkeleton />
      ) : clusterDisplayOptions.length > 0 ? (
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
              <MapSkeleton />
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

      {loading ? (
        <>
          <StatsSkeletonCards />
          <ClusterDetailsSkeleton />
        </>
      ) : clusterData ? (
        view === "district" ? (
          <div className="space-y-6">
            {selectedClusterStat ? (
              <SelectedClusterDetails
                stat={selectedClusterStat}
                clusterIndex={clusterColorIndex}
                selectedVariables={appliedVariables}
                illnesses={filteredIllnesses}
                nClusters={k}
                selectedCluster={selectedClusterId}
                loading={loading}
              />
            ) : null}
          </div>
        ) : (
          <>
            <StatisticsCards
              totalAllCases={totalAllCases}
              pinnedCases={pinnedCases}
              unpinnedCases={unpinnedCases}
              coveragePercent={coveragePercent}
              onTotalClick={() => setCoordinatesModal("total")}
              onPinnedClick={() => setCoordinatesModal("pinned")}
              onUnpinnedClick={() => setCoordinatesModal("unpinned")}
            />
            {selectedClusterStat ? (
              <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-2">
                <SelectedClusterDetails
                  stat={selectedClusterStat}
                  clusterIndex={clusterColorIndex}
                  selectedVariables={appliedVariables}
                  illnesses={filteredIllnesses}
                  nClusters={k}
                  selectedCluster={selectedClusterId}
                  loading={loading}
                />
              </div>
            ) : null}
          </>
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
