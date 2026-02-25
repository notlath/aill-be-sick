"use client";
import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Activity, AlertCircle } from "lucide-react";
import ClusterOverviewCards from "./cluster-overview-cards";
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
  const [loading, setLoading] = useState(!initialData); // Loading only if no initial data is provided
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
    city: true,
    region: false,
  });
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [pendingK, setPendingK] = useState<number | null>(null);
  const isInitialRender = useRef(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Fetch silhouette analysis to determine recommended k
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const fetchRecommendedK = async () => {
      try {
        setLoadingRecommendation(true);
        // Build query parameters based on selected variables
        const params = new URLSearchParams({
          range: "2-25",
          age: String(selectedVariables.age),
          gender: String(selectedVariables.gender),
          disease: String(selectedVariables.disease),
          region: String(selectedVariables.region),
          city: String(selectedVariables.city),
        });
        const res = await fetch(
          `http://localhost:10000/api/patient-clusters/silhouette?${params.toString()}`,
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
        // Fail silently - we'll just not show a recommendation
      } finally {
        setLoadingRecommendation(false);
      }
    };

    // Debounce by 300ms to prevent rapid refetches
    debounceTimerRef.current = setTimeout(fetchRecommendedK, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [selectedVariables]);

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
    // Skip on initial render until recommendedK is available and applied
    if (isInitialRender.current) {
      return;
    }

    fetchClusterData(k);
  }, [k, selectedVariables]);

  const clampK = (val: number) => {
    if (Number.isNaN(val)) return k; // ignore invalid
    if (val < 2) return 2;
    if (val > 25) return 25;
    return val;
  };

  const fetchClusterData = (clusterCount: number) => {
    setLoading(true);
    setError(null);
    // Build query parameters based on selected variables
    const params = new URLSearchParams({
      n_clusters: String(clusterCount),
      age: String(selectedVariables.age),
      gender: String(selectedVariables.gender),
      disease: String(selectedVariables.disease),
      region: String(selectedVariables.region),
      city: String(selectedVariables.city),
    });
    fetch(`http://localhost:10000/api/patient-clusters?${params.toString()}`)
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
      sessionStorage.setItem("patientClusters.k", String(nextK));
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
    // Count how many variables are currently selected
    const selectedCount =
      Object.values(selectedVariables).filter(Boolean).length;

    // If trying to uncheck the last selected variable, prevent it
    if (selectedVariables[variable] && selectedCount === 1) {
      return; // Do nothing - prevent unchecking last variable
    }

    setSelectedVariables((prev) => ({
      ...prev,
      [variable]: !prev[variable],
    }));
  };

  const handleDiseaseChange = () => {
    handleVariableChange("disease");
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
                className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.disease ? "btn-primary btn-soft" : ""}`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedVariables.disease}
                  onChange={handleDiseaseChange}
                />
                <span>Diagnosed disease</span>
              </label>
              <label
                className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.age ? "btn-primary btn-soft" : ""}`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedVariables.age}
                  onChange={() => handleVariableChange("age")}
                />
                <span>Age</span>
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
                <span>Gender</span>
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
            </div>

            {/* Groups */}
            <form onSubmit={onSubmitK} className="space-y-3">
              <div className="flex items-center gap-3">
                <label htmlFor="cluster-k" className="text-xs">
                  Groups:
                </label>
                <Input
                  id="cluster-k"
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
              {clusterData?.total_patients.toLocaleString() ?? "N/A"}
            </div>
            <div className="text-muted text-sm font-medium">Patients</div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex w-full flex-col gap-4">
          <div className="flex items-center justify-center gap-3">
            <Activity className="text-primary size-8 animate-spin" />
            <p className="text-muted-foreground text-sm font-medium">
              Recalculating clusters...
            </p>
          </div>
          {/* Skeletons mirroring cluster overview cards layout */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <Card key={index} className="border-muted bg-muted/40 h-130">
                <CardHeader className="space-y-3">
                  <div className="skeleton h-6 w-20" />
                  <div className="skeleton h-20 w-full" />
                  <div className="skeleton h-3 w-30" />
                  <div className="skeleton h-3 w-25" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!loading && (error || !clusterData) && (
        <Card className="col-span-2 border-red-200/50 bg-red-50/50">
          <CardHeader className="py-20 text-center">
            <div className="mx-auto w-fit rounded-[12px] bg-red-100 p-3">
              <AlertCircle className="size-8 text-red-700" />
            </div>
            <CardTitle className="mt-4 text-red-700">
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

      {modalRoot ? createPortal(confirmModal, modalRoot) : null}
    </div>
  );
};

export default PatientClustersClient;
