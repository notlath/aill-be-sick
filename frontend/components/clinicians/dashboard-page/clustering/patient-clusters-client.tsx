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
import { Users, MapPin, TrendingUp, Activity, AlertCircle } from "lucide-react";
import ClusterOverviewCards from "./cluster-overview-cards";
import ClusterDetailsTable from "./cluster-details-table";
import DemographicsCharts from "./demographics-charts";
import DiseasesCharts from "./diseases-charts";
import GeographicDistribution from "./geographic-distribution";
import type { PatientClusterData } from "@/types";
import { Input } from "@/components/ui/input";

interface PatientClustersClientProps {
  initialData: PatientClusterData;
  initialK: number;
}

const PatientClustersClient: React.FC<PatientClustersClientProps> = ({
  initialData,
  initialK,
}) => {
  const [clusterData, setClusterData] = useState<PatientClusterData | null>(
    initialData,
  );
  const [loading, setLoading] = useState(false); // Not loading on initial render
  const [error, setError] = useState<string | null>(null);
  const [k, setK] = useState<number>(initialK);
  const [kInput, setKInput] = useState<string>(String(initialK));
  const [recommendedK, setRecommendedK] = useState<number | null>(null);
  const [loadingRecommendation, setLoadingRecommendation] =
    useState<boolean>(true);
  const [selectedVariables, setSelectedVariables] = useState({
    age: true,
    gender: true,
    disease: true,
    region: true,
    city: true,
  });
  const isInitialRender = useRef(true);

  // Fetch silhouette analysis to determine recommended k and auto-apply it
  useEffect(() => {
    const fetchRecommendedK = async () => {
      try {
        setLoadingRecommendation(true);
        const res = await fetch(
          "http://localhost:10000/api/patient-clusters/silhouette?range=2-25",
        );
        if (!res.ok) {
          throw new Error("Failed to fetch silhouette analysis");
        }
        const data = await res.json();
        if (data.best && data.best.k) {
          setRecommendedK(data.best.k);
          // Auto-apply the recommended k
          setK(data.best.k);
          setKInput(String(data.best.k));
        }
      } catch (err) {
        console.error("Error fetching recommended k:", err);
        // Fail silently - we'll just not show a recommendation
      } finally {
        setLoadingRecommendation(false);
      }
    };

    fetchRecommendedK();
  }, []);

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
    if (val > 25) return 25;
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
    <div className="space-y-6">
      {/* Variable Selection Row */}
      <div className="card card-body bg-base-100 border border-base-300">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs text-base-content/70 ">
              Choose which variables to include in grouping
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3">
              <label
                className={`btn btn-sm cursor-pointer ${selectedVariables.disease ? "btn-primary btn-soft" : "font-normal"}`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedVariables.disease}
                  onChange={() =>
                    setSelectedVariables((prev) => ({
                      ...prev,
                      disease: !prev.disease,
                    }))
                  }
                />
                <span>Diagnosed disease</span>
              </label>
              <label
                className={`btn btn-sm cursor-pointer ${selectedVariables.age ? "btn-primary btn-soft" : "font-normal"}`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedVariables.age}
                  onChange={() =>
                    setSelectedVariables((prev) => ({
                      ...prev,
                      age: !prev.age,
                    }))
                  }
                />
                <span>Age</span>
              </label>
              <label
                className={`btn btn-sm cursor-pointer ${selectedVariables.gender ? "btn-primary btn-soft" : "font-normal"}`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedVariables.gender}
                  onChange={() =>
                    setSelectedVariables((prev) => ({
                      ...prev,
                      gender: !prev.gender,
                    }))
                  }
                />
                <span>Gender</span>
              </label>

              <label
                className={`btn btn-sm cursor-pointer ${selectedVariables.region ? "btn-primary btn-soft" : "font-normal"}`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedVariables.region}
                  onChange={() =>
                    setSelectedVariables((prev) => ({
                      ...prev,
                      region: !prev.region,
                    }))
                  }
                />
                <span>Region</span>
              </label>
              <label
                className={`btn btn-sm cursor-pointer ${selectedVariables.city ? "btn-primary btn-soft" : "font-normal"}`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedVariables.city}
                  onChange={() =>
                    setSelectedVariables((prev) => ({
                      ...prev,
                      city: !prev.city,
                    }))
                  }
                />
                <span>City</span>
              </label>
            </div>

            {/* Groups */}
            <form onSubmit={onSubmitK} className="space-y-3">
              <div className="flex items-center gap-3 ">
                <label htmlFor="cluster-k" className="text-xs font-medium">
                  Groups
                </label>
                <Input
                  id="cluster-k"
                  type="number"
                  className="w-18 h-8 text-xs font-medium"
                  min={2}
                  max={25}
                  value={kInput}
                  onChange={(e) => setKInput(e.target.value)}
                  disabled={loading}
                />

                <span className="text-xs text-muted font-normal">
                  {loadingRecommendation ? (
                    <>Calculating recommendation...</>
                  ) : recommendedK ? (
                    <>Recommended: {recommendedK} groups</>
                  ) : (
                    <>Recommended: 2-25 groups</>
                  )}
                </span>
              </div>

              <button
                type="submit"
                className="w-fit btn btn-primary btn-sm"
                title="Apply group settings"
                disabled={loading}
              >
                {loading ? "Applying..." : "Apply"}
              </button>
            </form>
          </div>
          <div className="text-right space-y-1">
            <div className="text-5xl font-semibold tracking-tight tabular-nums bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent">
              {clusterData?.total_patients.toLocaleString() ?? "N/A"}
            </div>
            <div className="text-sm font-medium text-muted">Patients</div>
          </div>
        </div>
      </div>

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
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientClustersClient;
