"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import IllnessClusterOverviewCards from "./illness-cluster-overview-cards";
import ClusteringControlPanel from "../../clustering/clustering-control-panel";
import type { IllnessClusterData } from "@/types";
import { DEFAULT_CLUSTER_COUNT } from "@/types/illness-cluster-settings";
import type { IllnessClusterMapNavigationContext } from "@/utils/illness-cluster-navigation";

interface IllnessClustersClientProps {
  initialData?: IllnessClusterData;
  initialK?: number;
  dateRange?: { start: Date | null; end: Date | null } | undefined;
}

const IllnessClustersClient: React.FC<IllnessClustersClientProps> = ({
  initialK = DEFAULT_CLUSTER_COUNT,
  dateRange,
}) => {
  return (
    <ClusteringControlPanel
      enableViewToggle={false}
      enableUrlSync={true}
      showClusterSelector={false}
      initialK={initialK}
      externalDateRange={dateRange}
    >
      {({
        clusterData,
        loading,
        error,
        appliedVariables,
        k,
        recommendedK,
        appliedStartDate,
        appliedEndDate,
      }) => {
        // Build context for map navigation links rendered in overview cards.
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const mapNavigationContext =
          useMemo<IllnessClusterMapNavigationContext>(() => {
            return {
              tab: "by-cluster",
              k,
              recommendedK,
              variables: appliedVariables,
              startDate: appliedStartDate || undefined,
              endDate: appliedEndDate || undefined,
            };
          }, [
            k,
            recommendedK,
            appliedVariables,
            appliedStartDate,
            appliedEndDate,
          ]);

        return (
          <div className="space-y-6">
            {loading ? (
              <div className="flex w-full flex-col gap-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[0, 1, 2, 3].map((index) => (
                    <Card key={index} className="border-border h-130">
                      <CardHeader className="space-y-3">
                        <div className="skeleton h-6 w-20" />
                        <div className="skeleton h-20 w-full" />
                        <div className="skeleton h-3 w-32" />
                        <div className="skeleton h-3 w-24" />
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            ) : null}

            {!loading && (error || !clusterData) ? (
              <Card className="col-span-2 border-red-200/50 bg-red-50/50">
                <CardHeader className="py-20 text-center">
                  <div className="mx-auto w-fit rounded-xl bg-red-100 p-3">
                    <AlertCircle className="size-8 text-red-700" />
                  </div>
                  <CardTitle className="mt-4 text-red-700">
                    Error Loading Group Data
                  </CardTitle>
                  <CardDescription className="text-red-600">
                    {error || "Could not retrieve illness group information."}
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : null}

            {!loading && !error && clusterData ? (
              <div className="space-y-6">
                <IllnessClusterOverviewCards
                  statistics={clusterData.cluster_statistics}
                  selectedVariables={appliedVariables}
                  illnesses={clusterData.illnesses}
                  mapNavigationContext={mapNavigationContext}
                />
              </div>
            ) : null}
          </div>
        );
      }}
    </ClusteringControlPanel>
  );
};

export default IllnessClustersClient;
