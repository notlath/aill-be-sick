"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { IllnessClusterTimelineChart } from "./illness-cluster-timeline-chart";
import SelectedClusterSummary from "./selected-cluster-summary";
import { PatientsDataTable } from "../patients-data-table";
import { columns } from "../patients-columns";
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
}

const SelectedClusterDetails = ({
  stat,
  clusterIndex,
  selectedVariables,
  illnesses,
  nClusters,
  selectedCluster,
  loading,
}: SelectedClusterDetailsProps) => {
  if (selectedCluster === null) return null;

  return (
    <div className="mt-2 space-y-4">
      <SelectedClusterSummary
        stat={stat}
        clusterIndex={clusterIndex}
        selectedVariables={selectedVariables}
      />
      {loading ? (
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
        <IllnessClusterTimelineChart
          illnesses={illnesses}
          nClusters={nClusters}
          selectedCluster={selectedCluster}
          clusterColorIndex={clusterIndex}
        />
      )}
      <Card className="relative overflow-hidden border">
        <div className="absolute inset-0 bg-base-100 opacity-90" />
        <CardHeader className="relative pb-4">
          <div className="font-semibold text-lg">
            All Patients in Group {clusterIndex + 1}
          </div>
          <p className="text-sm text-base-content/70">
            Showing {illnesses.length} diagnosis record
            {illnesses.length !== 1 ? "s" : ""}
          </p>
        </CardHeader>
        <CardContent className="relative pt-2">
          <PatientsDataTable columns={columns} data={illnesses} />
        </CardContent>
      </Card>
    </div>
  );
};

export default SelectedClusterDetails;
