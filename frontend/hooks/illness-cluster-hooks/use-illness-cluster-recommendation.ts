"use client";

import { useEffect, useRef, useState } from "react";
import type { ClusterVariableSelection } from "@/types/illness-cluster-settings";

type UseIllnessClusterRecommendationParams = {
  variables: ClusterVariableSelection;
  startDate: string;
  endDate: string;
};

type UseIllnessClusterRecommendationResult = {
  recommendedK: number | null;
  loading: boolean;
  message: string;
};

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:10000";

export const useIllnessClusterRecommendation = ({
  variables,
  startDate,
  endDate,
}: UseIllnessClusterRecommendationParams): UseIllnessClusterRecommendationResult => {
  const [recommendedK, setRecommendedK] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const fetchRecommendation = async () => {
      try {
        setLoading(true);
        setMessage("");
        const params = new URLSearchParams({
          range: "2-25",
          age: String(variables.age),
          gender: String(variables.gender),
          district: String(variables.district),
          time: String(variables.time),
        });

        if (startDate) params.set("start_date", startDate);
        if (endDate) params.set("end_date", endDate);

        const res = await fetch(
          `${BACKEND_URL}/api/illness-clusters/silhouette?${params.toString()}`,
        );
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Failed to fetch recommendation");
        }
        const data = await res.json();
        if (data.best && data.best.k) {
          setRecommendedK(data.best.k);
          setMessage("");
        } else {
          setRecommendedK(null);
          setMessage(
            "Recommendation is unavailable for the current date filter.",
          );
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch recommendation";
        setRecommendedK(null);

        if (/Not enough samples/i.test(errorMessage)) {
          setMessage(
            "Not enough diagnosis records in this date range to calculate a recommendation.",
          );
        } else {
          setMessage(
            "Recommendation is temporarily unavailable. You can still choose groups manually.",
          );
        }
      } finally {
        setLoading(false);
      }
    };

    debounceTimerRef.current = setTimeout(fetchRecommendation, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [variables, startDate, endDate]);

  return { recommendedK, loading, message };
};
