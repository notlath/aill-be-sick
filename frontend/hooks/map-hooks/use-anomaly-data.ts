"use client";

import { useEffect, useState } from "react";
import type { OutbreakFullResult } from "@/types";

type UseAnomalyDataParams = {
  contamination: number;
  disease: string;
  startDate: string;
  endDate: string;
};

type UseAnomalyDataResult = {
  anomalyData: OutbreakFullResult | null;
  loading: boolean;
  error: string | null;
};

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:10000";

export const useAnomalyData = ({
  contamination,
  disease,
  startDate,
  endDate,
}: UseAnomalyDataParams): UseAnomalyDataResult => {
  const [anomalyData, setAnomalyData] = useState<OutbreakFullResult | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchAnomalyData = async () => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        contamination: String(contamination),
      });

      if (disease && disease !== "all") params.set("disease", disease);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      try {
        const res = await fetch(
          `${BACKEND_URL}/api/surveillance/outbreaks?${params.toString()}`,
          { signal: controller.signal },
        );

        if (!res.ok) {
          throw new Error("Failed to fetch anomaly data");
        }

        const data = (await res.json()) as OutbreakFullResult;

        if (isMounted) {
          setAnomalyData(data);
        }
      } catch (err) {
        if (!isMounted || controller.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : "An unknown error occurred";
        setError(message);
        setAnomalyData(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAnomalyData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [contamination, disease, startDate, endDate]);

  return { anomalyData, loading, error };
};
