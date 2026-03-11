"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import useMapStore from "@/stores/use-map-store";
import { getClusterBaseColor } from "@/utils/cluster-colors";
import {
  buildClusterLegendBins,
  type ClusterLegendBin,
} from "@/utils/cluster-heatmap";
import PatientsModal from "../patients-modal";
import { AlertCircle } from "lucide-react";
import SelectedClusterDetails from "./selected-cluster-details";
import StatisticsCards from "./statistics-cards";
import { MapSkeleton } from "./skeleton-loaders";
import { useGeoJsonData } from "../../../../hooks/map-hooks/use-geojson-data";
import ClusteringControlPanel from "../../clustering/clustering-control-panel";

const ClusterChoroplethMap = dynamic(
  () => import("../map/cluster-choropleth-map"),
  { ssr: false },
);
const HeatmapMap = dynamic(() => import("../map/heatmap-map"), { ssr: false });

const ByClusterTab = () => {
  const { activeTab } = useMapStore();

  const {
    geoData,
    loading: geoLoading,
    error: geoError,
  } = useGeoJsonData("/geojson/bagong_silangan.geojson");

  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [coordinatesModal, setCoordinatesModal] = useState<
    "total" | "pinned" | "unpinned" | null
  >(null);

  return (
    <ClusteringControlPanel
      enableViewToggle={true}
      enableUrlSync={activeTab === "by-cluster"}
    >
      {({
        clusterData,
        loading,
        error,
        selectedClusterIndex,
        selectedClusterId,
        selectedClusterLabel,
        view,
        appliedVariables,
        k,
      }) => {
        // Map-specific data calculations.
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const filteredIllnesses = useMemo(() => {
          return (clusterData?.illnesses || []).filter(
            (illness) => illness.cluster === selectedClusterId,
          );
        }, [clusterData, selectedClusterId]);

        // eslint-disable-next-line react-hooks/rules-of-hooks
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

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const clusterBaseColor = useMemo(
          () => getClusterBaseColor(clusterColorIndex),
          [clusterColorIndex],
        );

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const legendResult = useMemo(() => {
          return buildClusterLegendBins(
            Object.values(casesData),
            clusterBaseColor,
          );
        }, [casesData, clusterBaseColor]);

        const legendBins = legendResult.bins as ClusterLegendBin[];
        const legendTitle = `Group ${selectedClusterLabel} Legend`;

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const selectedDistrictPatients = useMemo(() => {
          if (!selectedFeature) return [];
          return filteredIllnesses.filter(
            (illness) => illness.district === selectedFeature,
          );
        }, [filteredIllnesses, selectedFeature]);

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { pinnedCases, totalAllCases, unpinnedCases, coveragePercent } =
          useMemo(() => {
            const totalAllCases = filteredIllnesses.length;
            const pinnedIllnesses = filteredIllnesses.filter(
              (illness) =>
                illness.latitude != null && illness.longitude != null,
            );
            const pinnedCases = pinnedIllnesses.length;
            const unpinnedCases = totalAllCases - pinnedCases;
            const coveragePercent =
              totalAllCases > 0
                ? Math.round((pinnedCases / totalAllCases) * 100)
                : 0;
            return {
              pinnedCases,
              totalAllCases,
              unpinnedCases,
              coveragePercent,
            };
          }, [filteredIllnesses]);

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const coordinatesModalPatients = useMemo(() => {
          if (coordinatesModal === "total") return filteredIllnesses;
          if (coordinatesModal === "pinned") {
            return filteredIllnesses.filter(
              (diagnosis) =>
                diagnosis.latitude != null && diagnosis.longitude != null,
            );
          }
          if (coordinatesModal === "unpinned") {
            return filteredIllnesses.filter(
              (diagnosis) =>
                diagnosis.latitude == null || diagnosis.longitude == null,
            );
          }
          return [];
        }, [coordinatesModal, filteredIllnesses]);

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const selectedClusterStat = useMemo(() => {
          if (selectedClusterId === null || !clusterData) return null;
          return (
            clusterData.cluster_statistics.find(
              (stat) => stat.cluster_id === selectedClusterId,
            ) ?? null
          );
        }, [clusterData, selectedClusterId]);

        const isMapLoading = geoLoading || loading;

        return (
          <div className="space-y-4">
            {!loading && (error || geoError) ? (
              <Card className="col-span-2 border-red-200/50 bg-red-50/50">
                <CardHeader className="py-12 text-center">
                  <div className="mx-auto w-fit rounded-xl bg-red-100 p-3">
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

            {!loading && clusterData ? (
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
              title={`District ${selectedFeature ?? ""} - Group ${selectedClusterLabel}`}
              subtitle={`Showing ${selectedDistrictPatients.length} diagnosis record${selectedDistrictPatients.length !== 1 ? "s" : ""}`}
            />

            <PatientsModal
              isOpen={!!coordinatesModal}
              onClose={() => setCoordinatesModal(null)}
              patients={coordinatesModalPatients}
              clusterDisplay={selectedClusterLabel}
              title={
                coordinatesModal === "total"
                  ? `All Cases - Group ${selectedClusterLabel}`
                  : coordinatesModal === "pinned"
                    ? `Pinned Cases - Group ${selectedClusterLabel}`
                    : `Unpinned Cases - Group ${selectedClusterLabel}`
              }
              subtitle={`Showing ${coordinatesModalPatients.length} diagnosis record${coordinatesModalPatients.length !== 1 ? "s" : ""}`}
            />
          </div>
        );
      }}
    </ClusteringControlPanel>
  );
};

export default ByClusterTab;
