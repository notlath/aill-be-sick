"use client";
import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  MapPin,
  Calendar,
  TrendingUp,
  Activity,
  AlertCircle,
} from "lucide-react";
import ClusterOverviewCards from "./clustering/cluster-overview-cards";
import ClusterDetailsTable from "./clustering/cluster-details-table";
import DemographicsCharts from "./clustering/demographics-charts";
import DiseasesCharts from "./clustering/diseases-charts";
import GeographicDistribution from "./clustering/geographic-distribution";
import type { PatientClusterData } from "@/types/clustering";
import { Input } from "@/components/ui/input";

const PatientClusters: React.FC = () => {
  const [clusterData, setClusterData] = useState<PatientClusterData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [k, setK] = useState<number>(8); // default to k=8
  const [kInput, setKInput] = useState<string>("8");

  // Initialize k from session storage once (per tab session)
  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? sessionStorage.getItem("patientClusters.k")
          : null;
      if (raw) {
        const parsed = parseInt(raw, 10);
        let next = parsed;
        if (Number.isNaN(next)) next = 8;
        if (next < 2) next = 2;
        if (next > 20) next = 20;
        setK(next);
        setKInput(String(next));
      }
    } catch (_) {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:10000/api/patient-clusters?n_clusters=${k}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch cluster data");
        return res.json();
      })
      .then((data: PatientClusterData) => {
        setClusterData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch cluster data");
        setLoading(false);
      });
  }, [k]);

  const clampK = (val: number) => {
    if (Number.isNaN(val)) return k; // ignore invalid
    // keep sensible bounds; backend also guards
    if (val < 2) return 2;
    if (val > 20) return 20;
    return val;
  };

  const onSubmitK = (e: React.FormEvent) => {
    e.preventDefault();
    const next = clampK(parseInt(kInput, 10));
    setKInput(String(next));
    setK(next);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("patientClusters.k", String(next));
      }
    } catch (_) {
      // ignore storage errors
    }
  };

  if (loading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-3 rounded-[12px]">
              <Activity className="size-6 animate-pulse text-primary" />
            </div>
            <span>Loading Patient Clusters...</span>
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error || !clusterData) {
    return (
      <Card className="col-span-2 border-red-200/50 bg-red-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-red-700">
            <div className="bg-red-100 p-3 rounded-[12px]">
              <AlertCircle className="size-6" />
            </div>
            <span>Error Loading Clusters</span>
          </CardTitle>
          <CardDescription className="text-red-600 ml-[60px]">
            {error || "No data available"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="col-span-2 space-y-6">
      {/* Header Section */}
      <Card className="group hover:border-primary/30">
        <CardHeader>
          {/* Title Row */}
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
                {clusterData.total_patients.toLocaleString()}
              </div>
              <div className="text-sm font-medium text-muted">
                Total Patients
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-base-300/50 to-transparent my-6" />

          {/* Controls Row - Clean separation */}
          <div className="flex items-center justify-between">
            {/* Left: Cluster Settings */}
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
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-[8px] bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-all duration-300"
                  title="Apply cluster settings"
                >
                  Apply
                </button>
              </div>
              <span className="text-xs text-muted/70 font-medium">
                Recommended: 8 clusters
              </span>
            </form>

            {/* Right: Info Badges */}
            <div className="flex items-center gap-2.5">
              <Badge variant="outline" className="gap-2 px-3 py-2">
                <MapPin className="size-3.5 opacity-70" />
                <span className="font-medium">Geographic + Demographics</span>
              </Badge>
              <Badge variant="default" className="gap-2 px-3 py-2">
                <TrendingUp className="size-3.5" />
                <span className="font-semibold">
                  {clusterData.n_clusters} Clusters
                </span>
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Cluster Overview Cards (now illness-forward with dominant disease) */}
      <ClusterOverviewCards statistics={clusterData.cluster_statistics} />

      {/* Detailed Tabs */}
      <Tabs defaultValue="diseases" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="diseases">Diseases</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="geographic">Geographic</TabsTrigger>
          <TabsTrigger value="patients">Patients</TabsTrigger>
        </TabsList>

        <TabsContent value="diseases" className="space-y-4">
          <DiseasesCharts statistics={clusterData.cluster_statistics} />
        </TabsContent>

        <TabsContent value="demographics" className="space-y-4">
          <DemographicsCharts
            statistics={clusterData.cluster_statistics}
            patients={clusterData.patients}
          />
        </TabsContent>

        <TabsContent value="geographic" className="space-y-4">
          <GeographicDistribution
            statistics={clusterData.cluster_statistics}
            patients={clusterData.patients}
          />
        </TabsContent>

        <TabsContent value="patients" className="space-y-4">
          <ClusterDetailsTable
            patients={clusterData.patients}
            nClusters={clusterData.n_clusters}
            statistics={clusterData.cluster_statistics}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatientClusters;
