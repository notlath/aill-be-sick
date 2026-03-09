"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { IllnessClusterTimelineChart } from "./illness-cluster-timeline-chart";
import SelectedClusterSummary from "./selected-cluster-summary";
import type { ClusterVariableSelection } from "@/types/illness-cluster-settings";
import type { IllnessClusterStatistics } from "@/types";

interface SelectedClusterDetailsProps {
  stat: IllnessClusterStatistics;
  clusterIndex: number;
  selectedVariables: ClusterVariableSelection;
  illnesses: any[];
  nClusters: number;
  selectedCluster: number | null;
  loading: boolean;
  onViewAllPatients?: () => void;
}

const SelectedClusterDetails = ({
  stat,
  clusterIndex,
  selectedVariables,
  illnesses,
  nClusters,
  selectedCluster,
  loading,
  onViewAllPatients,
}: SelectedClusterDetailsProps) => {
  if (selectedCluster === null) return null;

  return (
    <div className="mt-2">
      <SelectedClusterSummary
        stat={stat}
        clusterIndex={clusterIndex}
        selectedVariables={selectedVariables}
        onViewAllPatients={onViewAllPatients}
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
            illnesses={illnesses}
            nClusters={nClusters}
            selectedCluster={selectedCluster}
            clusterColorIndex={clusterIndex}
          />
        </div>
      )}
    </div>
  );
};

export default SelectedClusterDetails;
