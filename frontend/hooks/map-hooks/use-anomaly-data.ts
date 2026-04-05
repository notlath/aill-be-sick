"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { OutbreakFullResult } from "@/types";

type UseAnomalyDataParams = {
  contamination: number;
  startDate: string;
  endDate: string;
  forceRefresh?: boolean;
};

type UseAnomalyDataResult = {
  anomalyData: OutbreakFullResult | null;
  loading: boolean;
  error: string | null;
  refetch: (options?: { forceRefresh?: boolean }) => void;
};

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:10000";

export const useAnomalyData = ({
  contamination,
  startDate,
  endDate,
  forceRefresh = false,
}: UseAnomalyDataParams): UseAnomalyDataResult => {
  const [anomalyData, setAnomalyData] = useState<OutbreakFullResult | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const forceRefreshRef = useRef(forceRefresh);
  useEffect(() => {
    forceRefreshRef.current = forceRefresh;
  }, [forceRefresh]);

  const fetchAnomalyData = useCallback(
    (overrideForceRefresh?: boolean) => {
      const shouldForceRefresh =
        overrideForceRefresh ?? forceRefreshRef.current;

      setLoading(true);
      setError(null);

      const controller = new AbortController();

      const params = new URLSearchParams({
        contamination: String(contamination),
      });

      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      if (shouldForceRefresh) params.set("force_refresh", "1");

      fetch(`${BACKEND_URL}/api/surveillance/outbreaks?${params.toString()}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error("Failed to fetch anomaly data");
          }
          const data = (await res.json()) as OutbreakFullResult;
          setAnomalyData(data);
          setError(null);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          const message =
            err instanceof Error ? err.message : "An unknown error occurred";
          setError(message);
          setAnomalyData(null);
        })
        .finally(() => {
          setLoading(false);
        });

      return () => controller.abort();
    },
    [contamination, startDate, endDate],
  );

  useEffect(() => {
    const cleanup = fetchAnomalyData();
    return cleanup;
  }, [contamination, startDate, endDate, refreshTrigger, fetchAnomalyData]);

  const refetch = useCallback(
    (options?: { forceRefresh?: boolean }) => {
      setRefreshTrigger((prev) => prev + 1);
      fetchAnomalyData(options?.forceRefresh);
    },
    [fetchAnomalyData],
  );

  return { anomalyData, loading, error, refetch };
};
