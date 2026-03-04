"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import IllnessClusterOverviewCards from "./illness-cluster-overview-cards";
import type { IllnessClusterData } from "@/types";
import { Input } from "@/components/ui/input";

interface IllnessClustersClientProps {
  initialData?: IllnessClusterData;
  initialK?: number;
}

const IllnessClustersClient: React.FC<IllnessClustersClientProps> = ({
  initialData,
  initialK = 4,
}) => {
  const [clusterData, setClusterData] = useState<IllnessClusterData | null>(
    initialData || null,
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [k, setK] = useState<number>(initialK);
  const [kInput, setKInput] = useState<string>(String(initialK));
  const [recommendedK, setRecommendedK] = useState<number | null>(null);
  const [loadingRecommendation, setLoadingRecommendation] =
    useState<boolean>(true);
  const [selectedVariables, setSelectedVariables] = useState({
    age: true,
    gender: true,
    city: true,
    region: false,
    time: false,
  });
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [pendingK, setPendingK] = useState<number | null>(null);
  const isInitialRender = useRef(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:10000";

  // Fetch silhouette analysis to determine recommended k
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const fetchRecommendedK = async () => {
      try {
        setLoadingRecommendation(true);
        const params = new URLSearchParams({
          range: "2-25",
          age: String(selectedVariables.age),
          gender: String(selectedVariables.gender),
          city: String(selectedVariables.city),
          region: String(selectedVariables.region),
          time: String(selectedVariables.time),
        });
        const res = await fetch(
          `${BACKEND_URL}/api/illness-clusters/silhouette?${params.toString()}`,
        );
        if (!res.ok) {
          throw new Error("Failed to fetch silhouette analysis");
        }
        const data = await res.json();
        if (data.best && data.best.k) {
          setRecommendedK(data.best.k);
          setKInput(String(data.best.k));
        }
      } catch (err) {
        console.error("Error fetching recommended k:", err);
      } finally {
        setLoadingRecommendation(false);
      }
    };

    debounceTimerRef.current = setTimeout(fetchRecommendedK, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [selectedVariables, BACKEND_URL]);

  // Auto-apply recommended k when it becomes available
  useEffect(() => {
    if (isInitialRender.current && recommendedK) {
      isInitialRender.current = false;
      setK(recommendedK);
    }
  }, [recommendedK]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load kmeans cluster data when k changes
  useEffect(() => {
    if (isInitialRender.current) {
      return;
    }

    fetchClusterData(k);
  }, [k, selectedVariables, BACKEND_URL]);

  const clampK = (val: number) => {
    if (Number.isNaN(val)) return k;
    if (val < 2) return 2;
    if (val > 25) return 25;
    return val;
  };

  const fetchClusterData = (clusterCount: number) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      n_clusters: String(clusterCount),
      age: String(selectedVariables.age),
      gender: String(selectedVariables.gender),
      city: String(selectedVariables.city),
      region: String(selectedVariables.region),
      time: String(selectedVariables.time),
    });
    fetch(`${BACKEND_URL}/api/illness-clusters?${params.toString()}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch updated cluster data");
        }
        return res.json();
      })
      .then((data: IllnessClusterData) => {
        setClusterData(data);
      })
      .catch((err) => {
        setError(err.message || "An unknown error occurred");
        setClusterData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const onSubmitK = (e: React.FormEvent) => {
    e.preventDefault();
    const nextK = clampK(parseInt(kInput, 10));

    if (loadingRecommendation) {
      setPendingK(nextK);
      setShowConfirmModal(true);
      return;
    }

    applyClusteringWithK(nextK);
  };

  const applyClusteringWithK = (clusterCount: number) => {
    const nextK = clampK(clusterCount);
    setK(nextK);
    setKInput(String(nextK));
    try {
      sessionStorage.setItem("illnessClusters.k", String(nextK));
    } catch (_) {
      // Ignore session storage errors
    }
  };

  const handleConfirmModal = () => {
    if (pendingK !== null) {
      applyClusteringWithK(pendingK);
    }
    setShowConfirmModal(false);
    setPendingK(null);
  };

  const handleCancelModal = () => {
    setShowConfirmModal(false);
    setPendingK(null);
  };

  const handleVariableChange = (variable: keyof typeof selectedVariables) => {
    const selectedCount =
      Object.values(selectedVariables).filter(Boolean).length;

    if (selectedVariables[variable] && selectedCount === 1) {
      return;
    }

    setSelectedVariables((prev) => ({
      ...prev,
      [variable]: !prev[variable],
    }));
  };

  const modalRoot = isMounted ? document.body : null;
  const confirmModal = (
    <div className={`modal ${showConfirmModal ? "modal-open" : ""}`}>
      <div className="modal-box">
        <h3 className="text-lg font-semibold">Confirm Group Settings</h3>
        <p className="text-base-content/80 py-4 text-sm">
          You&apos;re about to create{" "}
          <span className="font-semibold">{pendingK}</span> groups, but the
          recommended number is still{" "}
          <span className="font-semibold">being calculated</span>. Do you want
          to continue?
        </p>
        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleConfirmModal}
          >
            Proceed
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleCancelModal}
          >
            Cancel
          </button>
        </div>
      </div>
      <form
        method="dialog"
        className="modal-backdrop"
        onClick={handleCancelModal}
      >
        <button>close</button>
      </form>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Variable Selection Row */}
      <div className="card card-body bg-base-100 border-base-300 border">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h2 className="text-base font-semibold">Select variables</h2>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3">
              <label
                className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.age ? "btn-primary btn-soft" : ""}`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedVariables.age}
                  onChange={() => handleVariableChange("age")}
                />
                <span>Patient age</span>
              </label>
              <label
                className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.gender ? "btn-primary btn-soft" : ""}`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedVariables.gender}
                  onChange={() => handleVariableChange("gender")}
                />
                <span>Patient gender</span>
              </label>
              <label
                className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.city ? "btn-primary btn-soft" : ""}`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedVariables.city}
                  onChange={() => {
                    const selectedCount =
                      Object.values(selectedVariables).filter(Boolean).length;
                    if (selectedVariables.city && selectedCount === 1) return;
                    setSelectedVariables((prev) => ({
                      ...prev,
                      city: !prev.city,
                      region: false,
                    }));
                  }}
                />
                <span>City</span>
              </label>
              <label
                className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.region ? "btn-primary btn-soft" : ""}`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedVariables.region}
                  onChange={() => {
                    const selectedCount =
                      Object.values(selectedVariables).filter(Boolean).length;
                    if (selectedVariables.region && selectedCount === 1) return;
                    setSelectedVariables((prev) => ({
                      ...prev,
                      region: !prev.region,
                      city: false,
                    }));
                  }}
                />
                <span>Region</span>
              </label>
              <label
                className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.time ? "btn-primary btn-soft" : ""}`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedVariables.time}
                  onChange={() => handleVariableChange("time")}
                />
                <span>Time (seasonal)</span>
              </label>
            </div>

            {/* Groups */}
            <form onSubmit={onSubmitK} className="space-y-3">
              <div className="flex items-center gap-3">
                <label htmlFor="illness-cluster-k" className="text-xs">
                  Groups:
                </label>
                <Input
                  id="illness-cluster-k"
                  type="number"
                  className="input h-7 w-17 text-xs font-medium"
                  min={2}
                  max={25}
                  value={kInput}
                  onChange={(e) => setKInput(e.target.value)}
                  disabled={loading}
                />

                <span className="text-muted text-xs font-normal">
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
                className="btn btn-primary btn-sm w-fit"
                title="Apply group settings"
                disabled={loading}
              >
                {loading ? "Applying..." : "Apply"}
              </button>
            </form>
          </div>
          <div className="space-y-1 text-right">
            <div className="from-primary to-primary/70 bg-gradient-to-br bg-clip-text text-5xl font-semibold tracking-tight text-transparent tabular-nums">
              {clusterData?.total_illnesses.toLocaleString() ?? "N/A"}
            </div>
            <div className="text-muted text-sm font-medium">Diagnoses</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex w-full flex-col gap-4">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="text-primary size-8 animate-spin" />
            <p className="text-muted-foreground text-sm font-medium">
              Recalculating clusters...
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <Card key={index} className="border-border h-[520px]">
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
            <div className="mx-auto w-fit rounded-[12px] bg-red-100 p-3">
              <AlertCircle className="size-8 text-red-700" />
            </div>
            <CardTitle className="mt-4 text-red-700">
              Error Loading Cluster Data
            </CardTitle>
            <CardDescription className="text-red-600">
              {error || "Could not retrieve illness cluster information."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!loading && !error && clusterData ? (
        <div className="space-y-6">
          <IllnessClusterOverviewCards statistics={clusterData.cluster_statistics} />
        </div>
      ) : null}

      {modalRoot ? createPortal(confirmModal, modalRoot) : null}
    </div>
  );
};

export default IllnessClustersClient;
