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
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5 animate-pulse" />
            Loading Patient Clusters...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error || !clusterData) {
    return (
      <Card className="col-span-2 border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="size-5" />
            Error Loading Clusters
          </CardTitle>
          <CardDescription className="text-red-600">
            {error || "No data available"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="col-span-2 space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="size-6 text-primary" />
                Patient Population Analysis
              </CardTitle>
              <CardDescription className="mt-2">
                Machine learning-based patient clustering for population health
                insights
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                {clusterData.total_patients}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Patients
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <form onSubmit={onSubmitK} className="flex items-center gap-2">
              <label
                htmlFor="cluster-k"
                className="text-sm text-muted-foreground"
              >
                Clusters (k)
              </label>
              <Input
                id="cluster-k"
                type="number"
                className="w-20"
                min={2}
                max={20}
                value={kInput}
                onChange={(e) => setKInput(e.target.value)}
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-md border text-sm hover:bg-accent"
                title="Apply clusters"
              >
                Apply
              </button>
              <span className="text-xs text-muted-foreground italic ml-1">
                (recommended: 8)
              </span>
            </form>
            <Badge variant="outline" className="gap-1">
              <MapPin className="size-3" />
              Geographic + Demographics
            </Badge>
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="size-3" />
              {clusterData.n_clusters} Clusters Identified
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Cluster Overview Cards (now illness-forward with dominant disease) */}
      <ClusterOverviewCards statistics={clusterData.cluster_statistics} />

      {/* Detailed Tabs */}
      <Tabs defaultValue="diseases" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
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
