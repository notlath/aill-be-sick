"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
import { getSurveillanceExportData, type SurveillanceExportData } from "@/utils/report-export";
import { ExportReportButton } from "@/components/ui/export-report-button";
import { PdfImage } from "@/utils/pdf-export";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  MapSkeleton,
  StatsSkeletonCards,
  ClusterDetailsSkeleton,
} from "./skeleton-loaders";
import { useGeoJsonData } from "../../../../hooks/map-hooks/use-geojson-data";
import ClusteringControlPanel from "../../clustering/clustering-control-panel";

const ClusterChoroplethMap = dynamic(
  () => import("../map/cluster-choropleth-map"),
  { ssr: false },
);
const HeatmapMap = dynamic(() => import("../map/heatmap-map"), { ssr: false });

const ByClusterTab = () => {
  const { activeTab } = useMapStore();
  const generatedBy = useCurrentUser();

  const {
    geoData,
    loading: geoLoading,
    error: geoError,
  } = useGeoJsonData("/geojson/bagong_silangan.geojson");

  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

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
        exportButtonTarget,
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
        const selectedClusterStat = useMemo(() => {
          if (selectedClusterId === null || !clusterData) return null;
          return (
            clusterData.cluster_statistics.find(
              (stat) => stat.cluster_id === selectedClusterId,
            ) ?? null
          );
        }, [clusterData, selectedClusterId]);

        const isMapLoading = geoLoading || loading;

        const captureImages = async () => {
          const domtoimage = (await import('dom-to-image-more')).default;
          const images: PdfImage[] = [];

          // Suppress console errors during capture
          const originalConsoleError = console.error;
          console.error = () => {};

          try {
            // Capture map
            const mapElement = document.querySelector('[data-surveillance-map]');
            if (mapElement) {
              const dataUrl = await domtoimage.toPng(mapElement as HTMLElement, {
                quality: 0.8,
                filter: (node: Node) => {
                  return !(node instanceof Element && node.tagName && node.tagName.toLowerCase() === 'link');
                },
              });
              const img = new Image();
              img.src = dataUrl;
              await new Promise(resolve => img.onload = resolve);
              images.push({
                dataUrl,
                width: img.width,
                height: img.height,
                title: 'Case Group Surveillance Map',
              });
            }
          } finally {
            console.error = originalConsoleError;
          }

          return images;
        };

        const exportInfo = useMemo(() => {
          if (!clusterData || !selectedClusterStat) return null;

          const stats: Record<string, unknown> = {
            clusterId: selectedClusterId,
            clusterLabel: selectedClusterLabel,
            totalIllnesses: filteredIllnesses.length,
            ...selectedClusterStat,
            nClusters: k,
            appliedVariables,
          };

          const illnessesData = filteredIllnesses.map(i => ({
            id: i.id,
            disease: i.disease,
            district: i.district,
            latitude: i.latitude,
            longitude: i.longitude,
            createdAt: i.diagnosed_at,
            cluster: i.cluster,
          }));

          const exportData: SurveillanceExportData = {
            tab: "by-cluster",
            disease: "all", // clusters are across diseases
            view,
            stats,
            mapData: illnessesData,
          };

          return getSurveillanceExportData(exportData);
        }, [clusterData, selectedClusterStat, selectedClusterId, selectedClusterLabel, filteredIllnesses, k, appliedVariables, view]);

        return (
          <div className="space-y-4">
            {exportButtonTarget && exportInfo && createPortal(
              <ExportReportButton
                data={exportInfo.data}
                columns={exportInfo.columns}
                filenameSlug={exportInfo.filenameSlug}
                title={exportInfo.title}
                subtitle={exportInfo.subtitle}
                disabled={loading}
                images={captureImages}
                generatedBy={generatedBy}
              />,
              exportButtonTarget,
            )}

            {!loading && (error || geoError) ? (
              <Card className="col-span-2 border-red-200/50 bg-red-50/50">
                <CardHeader className="py-12 text-center">
                  <div className="mx-auto w-fit rounded-xl bg-red-100 p-3">
                    <AlertCircle className="size-8 text-red-700" />
                  </div>
                  <CardTitle className="mt-4 text-red-700">
                    Error Loading Group Data
                  </CardTitle>
                  <p className="text-red-600 text-sm">{error || geoError}</p>
                </CardHeader>
              </Card>
            ) : null}

            <div data-surveillance-map suppressHydrationWarning>
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

            {loading && clusterData === null ? (
              view === "district" ? (
                <div className="space-y-6">
                  <StatsSkeletonCards />
                  <ClusterDetailsSkeleton />
                </div>
              ) : (
                <div className="space-y-6">
                  <StatsSkeletonCards />
                  <ClusterDetailsSkeleton />
                </div>
              )
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
                    totalCases={filteredIllnesses.length}
                    stat={selectedClusterStat}
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
          </div>
        );
      }}
    </ClusteringControlPanel>
  );
};

export default ByClusterTab;
