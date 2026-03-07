"use client";

import { useEffect, useMemo } from "react";
import type { IllnessClusterData } from "@/types";

type UseClusterDisplayResult = {
  clusterOrder: number[];
  clusterDisplayOptions: Array<{ label: string; value: string }>;
  selectedClusterIndex: number;
  selectedClusterId: number;
  selectedClusterLabel: string;
};

export const useClusterDisplay = (
  clusterData: IllnessClusterData | null,
  selectedClusterDisplay: string,
  setSelectedClusterDisplay: (value: string) => void,
): UseClusterDisplayResult => {
  const clusterOrder = useMemo(() => {
    if (!clusterData?.cluster_statistics) return [];
    return [...clusterData.cluster_statistics]
      .sort((a, b) => b.count - a.count)
      .map((stat) => stat.cluster_id);
  }, [clusterData]);

  const clusterDisplayOptions = useMemo(() => {
    if (!clusterData?.cluster_statistics) return [];
    const sorted = [...clusterData.cluster_statistics].sort(
      (a, b) => b.count - a.count,
    );
    return sorted.map((stat, index) => ({
      label: `Group ${index + 1} — ${stat.count} diagnoses`,
      value: String(index + 1),
    }));
  }, [clusterData]);

  useEffect(() => {
    if (clusterDisplayOptions.length === 0) return;
    const current = Number(selectedClusterDisplay);
    if (
      Number.isNaN(current) ||
      current < 1 ||
      current > clusterDisplayOptions.length
    ) {
      setSelectedClusterDisplay("1");
    }
  }, [clusterDisplayOptions, selectedClusterDisplay, setSelectedClusterDisplay]);

  const selectedClusterIndex = Math.max(0, Number(selectedClusterDisplay) - 1);
  const selectedClusterId =
    clusterOrder[selectedClusterIndex] ?? selectedClusterIndex;
  const selectedClusterLabel = selectedClusterDisplay || "1";

  return {
    clusterOrder,
    clusterDisplayOptions,
    selectedClusterIndex,
    selectedClusterId,
    selectedClusterLabel,
  };
};
