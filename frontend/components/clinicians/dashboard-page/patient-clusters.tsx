import { getPatientClusters } from "@/utils/cluster";
import PatientClustersClient from "./clustering/patient-clusters-client";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Activity } from "lucide-react";
import { Suspense } from "react";

const DEFAULT_K = 8;

const PatientClusters = async () => {
  try {
    const initialClusterData = await getPatientClusters(DEFAULT_K);
    return (
      <PatientClustersClient
        initialData={initialClusterData}
        initialK={DEFAULT_K}
      />
    );
  } catch (error) {
    console.error("Failed to fetch initial patient clusters:", error);
    return (
      <Card className="col-span-2 border-red-200/50 bg-red-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-red-700">
            <div className="bg-red-100 p-3 rounded-[12px]">
              <AlertCircle className="size-6" />
            </div>
            <span>Error Loading Patient Clusters</span>
          </CardTitle>
          <CardDescription className="text-red-600 ml-[60px]">
            Could not connect to the clustering service. Please ensure it is
            running and try again.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
};

const PatientClustersWrapper = () => {
  return (
    <Suspense
      fallback={
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-3 rounded-[12px]">
                <Activity className="size-6 animate-pulse text-primary" />
              </div>
              <span>Loading Patient Clusters...</span>
            </CardTitle>
            <CardDescription>
              Fetching initial population health insights.
            </CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <PatientClusters />
    </Suspense>
  );
};

export default PatientClustersWrapper;