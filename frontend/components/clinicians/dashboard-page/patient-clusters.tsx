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
  const initialClusterData = await getPatientClusters(DEFAULT_K);

  if (!initialClusterData) {
    return (
      <Card className="col-span-2 border-red-200/50 bg-red-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-red-700">
            <div className="rounded-[12px] bg-red-100 p-3">
              <AlertCircle className="size-6" />
            </div>
            <span>Error Loading Patient Clusters</span>
          </CardTitle>
          <CardDescription className="ml-[60px] text-red-600">
            Could not connect to the clustering service. Please ensure it is
            running and try again.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  console.log({ initialClusterData })

  return (
    <PatientClustersClient
      initialData={initialClusterData}
      initialK={DEFAULT_K}
    />
  );
};

const PatientClustersWrapper = () => {
  return (
    <Suspense
      fallback={
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="from-primary/10 to-primary/5 rounded-[12px] bg-gradient-to-br p-3">
                <Activity className="text-primary size-6 animate-pulse" />
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
