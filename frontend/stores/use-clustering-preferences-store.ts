import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  clampClusterCount,
  DEFAULT_CLUSTER_COUNT,
  DEFAULT_CLUSTER_VARIABLES,
  normalizeClusterVariables,
  type ClusterVariableSelection,
} from "@/types/illness-cluster-settings";

type ClusteringPreferenceInput = {
  k: number;
  recommendedK?: number;
  variables: ClusterVariableSelection;
  startDate?: string;
  endDate?: string;
  clusterDisplay?: string;
};

interface ClusteringPreferencesState {
  hasSavedPreferences: boolean;
  k: number;
  recommendedK?: number;
  variables: ClusterVariableSelection;
  startDate?: string;
  endDate?: string;
  clusterDisplay: string;
  savePreferences: (input: ClusteringPreferenceInput) => void;
  reset: () => void;
}

const DEFAULT_CLUSTER_DISPLAY = "1";

const normalizeClusterDisplay = (
  value: string | undefined,
  k: number,
): string => {
  if (!value || !/^\d+$/.test(value)) {
    return DEFAULT_CLUSTER_DISPLAY;
  }

  const numericValue = Number(value);
  const normalizedValue = Math.max(1, Math.floor(numericValue));
  return String(Math.min(normalizedValue, k));
};

const normalizeDateValue = (value?: string): string | undefined => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const [yearString, monthString, dayString] = value.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return undefined;
  }

  const parsedDate = new Date(year, month - 1, day);
  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return undefined;
  }

  return value;
};

const normalizeDateRange = (
  startDate?: string,
  endDate?: string,
): { startDate?: string; endDate?: string } => {
  const normalizedStartDate = normalizeDateValue(startDate);
  const normalizedEndDate = normalizeDateValue(endDate);

  if (!normalizedStartDate || !normalizedEndDate) {
    return { startDate: undefined, endDate: undefined };
  }

  if (normalizedStartDate > normalizedEndDate) {
    return { startDate: undefined, endDate: undefined };
  }

  return {
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
  };
};

const normalizeRecommendedClusterCount = (
  value?: number,
): number | undefined => {
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isFinite(value)
  ) {
    return undefined;
  }

  return clampClusterCount(value, DEFAULT_CLUSTER_COUNT);
};

const INITIAL_STATE = {
  hasSavedPreferences: false,
  k: DEFAULT_CLUSTER_COUNT,
  recommendedK: undefined,
  variables: DEFAULT_CLUSTER_VARIABLES,
  startDate: undefined,
  endDate: undefined,
  clusterDisplay: DEFAULT_CLUSTER_DISPLAY,
};

const useClusteringPreferencesStore = create<ClusteringPreferencesState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      savePreferences: ({
        k,
        recommendedK,
        variables,
        startDate,
        endDate,
        clusterDisplay,
      }) => {
        const normalizedK = clampClusterCount(k, DEFAULT_CLUSTER_COUNT);
        const normalizedVariables = normalizeClusterVariables(
          variables,
          DEFAULT_CLUSTER_VARIABLES,
        );
        const normalizedDateRange = normalizeDateRange(startDate, endDate);

        set({
          hasSavedPreferences: true,
          k: normalizedK,
          recommendedK: normalizeRecommendedClusterCount(recommendedK),
          variables: normalizedVariables,
          startDate: normalizedDateRange.startDate,
          endDate: normalizedDateRange.endDate,
          clusterDisplay: normalizeClusterDisplay(clusterDisplay, normalizedK),
        });
      },
      reset: () => {
        set({ ...INITIAL_STATE });
      },
    }),
    {
      name: "clustering-preferences",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        hasSavedPreferences: state.hasSavedPreferences,
        k: state.k,
        recommendedK: state.recommendedK,
        variables: state.variables,
        startDate: state.startDate,
        endDate: state.endDate,
        clusterDisplay: state.clusterDisplay,
      }),
    },
  ),
);

export default useClusteringPreferencesStore;
