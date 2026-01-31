"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  MapPin,
  TrendingUp,
  Activity,
  AlertCircle,
} from "lucide-react";
import ClusterOverviewCards from "./cluster-overview-cards";
import ClusterDetailsTable from "./cluster-details-table";
import DemographicsCharts from "./demographics-charts";
import DiseasesCharts from "./diseases-charts";
import GeographicDistribution from "./geographic-distribution";
import type { PatientClusterData } from "@/types/clustering";
import { Input } from "@/components/ui/input";

interface PatientClustersClientProps {
  initialData: PatientClusterData;
  initialK: number;
}

const PatientClustersClient: React.FC<PatientClustersClientProps> = ({
  initialData,
  initialK,
}) => {
  const [clusterData, setClusterData] =
    useState<PatientClusterData | null>(initialData);
  const [loading, setLoading] = useState(false); // Not loading on initial render
  const [error, setError] = useState<string | null>(null);
  const [k, setK] = useState<number>(initialK);
  const [kInput, setKInput] = useState<string>(String(initialK));
  const isInitialRender = useRef(true);

  useEffect(() => {
    // This effect should only run when `k` is changed by the user, not on initial render.
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    setLoading(true);
    setError(null);
    fetch(`http://localhost:10000/api/patient-clusters?n_clusters=${k}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch updated cluster data");
        }
        return res.json();
      })
      .then((data: PatientClusterData) => {
        setClusterData(data);
      })
      .catch((err) => {
        setError(err.message || "An unknown error occurred");
        setClusterData(null); // Clear data on error to show error state
      })
      .finally(() => {
        setLoading(false);
      });
  }, [k]);

  const clampK = (val: number) => {
    if (Number.isNaN(val)) return k; // ignore invalid
    if (val < 2) return 2;
    if (val > 20) return 20;
    return val;
  };

  const onSubmitK = (e: React.FormEvent) => {
    e.preventDefault();
    const nextK = clampK(parseInt(kInput, 10));
    setKInput(String(nextK));
    // Setting `k` will trigger the useEffect to fetch new data
    setK(nextK);
    try {
      sessionStorage.setItem("patientClusters.k", String(nextK));
    } catch (_) {
      // Ignore session storage errors
    }
  };

  return (
    <div className="col-span-2 space-y-6">
      {/* Header Section */}
      <Card className="group hover:border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-3.5 rounded-[14px]">
                <Users className="size-7 text-primary stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-3xl tracking-tight">
                  Patient Population Analysis
                </CardTitle>
                <CardDescription className="text-base mt-1.5">
                  Machine learning-based clustering for population health
                  insights
                </CardDescription>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-5xl font-semibold tracking-tight tabular-nums bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent">
                {clusterData?.total_patients.toLocaleString() ?? "N/A"}
              </div>
              <div className="text-sm font-medium text-muted">
                Total Patients
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-base-300/50 to-transparent my-6" />

          <div className="flex items-center justify-between">
            <form onSubmit={onSubmitK} className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-base-200/30 rounded-[12px] px-4 py-2.5 border border-base-300/30">
                <label
                  htmlFor="cluster-k"
                  className="text-sm font-medium text-base-content/80"
                >
                  Clusters
                </label>
                <Input
                  id="cluster-k"
                  type="number"
                  className="w-16 h-8 text-center font-semibold"
                  min={2}
                  max={20}
                  value={kInput}
                  onChange={(e) => setKInput(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-[8px] bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-all duration-300 disabled:opacity-50"
                  title="Apply cluster settings"
                  disabled={loading}
                >
                  {loading ? "Applying..." : "Apply"}
                </button>
              </div>
              <span className="text-xs text-muted/70 font-medium">
                Recommended: 8 clusters
              </span>
            </form>

            <div className="flex items-center gap-2.5">
              <Badge variant="outline" className="gap-2 px-3 py-2">
                <MapPin className="size-3.5 opacity-70" />
                <span className="font-medium">Geographic + Demographics</span>
              </Badge>
              <Badge variant="default" className="gap-2 px-3 py-2">
                <TrendingUp className="size-3.5" />
                <span className="font-semibold">
                  {clusterData?.n_clusters ?? k} Clusters
                </span>
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content Area */}
      <div className="relative min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 bg-white/70 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center z-20 rounded-xl">
            <div className="flex flex-col items-center gap-3">
              <Activity className="size-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">
                Recalculating clusters...
              </p>
            </div>
          </div>
        )}

        {!loading && (error || !clusterData) && (
          <Card className="col-span-2 border-red-200/50 bg-red-50/50">
            <CardHeader className="text-center py-20">
              <div className="mx-auto bg-red-100 p-3 rounded-[12px] w-fit">
                <AlertCircle className="size-8 text-red-700" />
              </div>
              <CardTitle className="text-red-700 mt-4">
                Error Loading Cluster Data
              </CardTitle>
              <CardDescription className="text-red-600">
                {error || "Could not retrieve patient cluster information."}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!loading && !error && clusterData && (
          <div className="space-y-6">
            <ClusterOverviewCards statistics={clusterData.cluster_statistics} />
            <Tabs defaultValue="diseases" className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-auto">
                <TabsTrigger value="diseases">Diseases</TabsTrigger>
                <TabsTrigger value="demographics">Demographics</TabsTrigger>
                <TabsTrigger value="geographic">Geographic</TabsTrigger>
                <TabsTrigger value="patients">Patients</TabsTrigger>
              </TabsList>

              <TabsContent value="diseases" className="mt-6 space-y-4">
                <DiseasesCharts statistics={clusterData.cluster_statistics} />
              </TabsContent>
              <TabsContent value="demographics" className="mt-6 space-y-4">
                <DemographicsCharts
                  statistics={clusterData.cluster_statistics}
                  patients={clusterData.patients}
                />
              </TabsContent>
              <TabsContent value="geographic" className="mt-6 space-y-4">
                <GeographicDistribution
                  statistics={clusterData.cluster_statistics}
                  patients={clusterData.patients}
                />
              </TabsContent>
              <TabsContent value="patients" className="mt-6 space-y-4">
                <ClusterDetailsTable
                  patients={clusterData.patients}
                  nClusters={clusterData.n_clusters}
                  statistics={clusterData.cluster_statistics}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientClustersClient;
