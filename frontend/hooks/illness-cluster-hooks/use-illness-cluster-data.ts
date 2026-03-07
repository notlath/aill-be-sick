"use client";

import { useEffect, useState } from "react";
import type { IllnessClusterData } from "@/types";

type ClusterVariableSelection = {
  age: boolean;
  gender: boolean;
  district: boolean;
  time: boolean;
};

type UseIllnessClusterDataParams = {
  k: number;
  variables: ClusterVariableSelection;
  startDate: string;
  endDate: string;
};

type UseIllnessClusterDataResult = {
  clusterData: IllnessClusterData | null;
  loading: boolean;
  error: string | null;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:10000";

export const useIllnessClusterData = ({
  k,
  variables,
  startDate,
  endDate,
}: UseIllnessClusterDataParams): UseIllnessClusterDataResult => {
  const [clusterData, setClusterData] = useState<IllnessClusterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchClusterData = async () => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        n_clusters: String(k),
        age: String(variables.age),
        gender: String(variables.gender),
        district: String(variables.district),
        time: String(variables.time),
      });

      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      try {
        const res = await fetch(
          `${BACKEND_URL}/api/illness-clusters?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          throw new Error("Failed to fetch cluster data");
        }
        const data = (await res.json()) as IllnessClusterData;
        if (isMounted) {
          setClusterData(data);
        }
      } catch (err) {
        if (!isMounted || controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        setError(message);
        setClusterData(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchClusterData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [k, variables, startDate, endDate]);

  return { clusterData, loading, error };
};
