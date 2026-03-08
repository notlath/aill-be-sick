import type { SearchParams } from "@/types";
import {
  DEFAULT_CLUSTER_COUNT,
  DEFAULT_CLUSTER_VARIABLES,
  clampClusterCount,
  normalizeClusterVariables,
  type ClusterVariableSelection,
} from "@/types/illness-cluster-settings";

export type MapTabKey = "by-disease" | "by-cluster" | "by-anomaly";

const VALID_MAP_TABS: ReadonlySet<MapTabKey> = new Set([
  "by-disease",
  "by-cluster",
  "by-anomaly",
]);

const DEFAULT_TAB: MapTabKey = "by-cluster";
const DEFAULT_CLUSTER_DISPLAY = "1";

export type IllnessClusterNavigationState = {
  tab: MapTabKey;
  clusterDisplay: string;
  k: number;
  variables: ClusterVariableSelection;
  startDate?: string;
  endDate?: string;
};

export type IllnessClusterNavigationQueryInput = {
  tab?: string;
  clusterDisplay?: string | number;
  k?: number;
  variables?: Partial<ClusterVariableSelection>;
  startDate?: string;
  endDate?: string;
};

export type IllnessClusterMapNavigationContext = Omit<
  IllnessClusterNavigationQueryInput,
  "clusterDisplay"
>;

const isValidDateValue = (value?: string): value is string => {
  if (!value) {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === value;
};

const normalizeDateValue = (value?: string): string | undefined => {
  if (!isValidDateValue(value)) {
    return undefined;
  }

  return value;
};

/**
 * Validates that a date range is logically correct (start <= end).
 * Returns normalized dates if valid, undefined for both if invalid.
 */
const validateDateRange = (
  startDate?: string,
  endDate?: string,
): { startDate?: string; endDate?: string } => {
  const normalizedStart = normalizeDateValue(startDate);
  const normalizedEnd = normalizeDateValue(endDate);

  if (!normalizedStart || !normalizedEnd) {
    return { startDate: undefined, endDate: undefined };
  }

  if (normalizedStart > normalizedEnd) {
    // Invalid range: start date is after end date, discard both
    return { startDate: undefined, endDate: undefined };
  }

  return { startDate: normalizedStart, endDate: normalizedEnd };
};

const normalizeMapTab = (tab?: string): MapTabKey => {
  if (tab && VALID_MAP_TABS.has(tab as MapTabKey)) {
    return tab as MapTabKey;
  }

  return DEFAULT_TAB;
};

/**
 * Normalizes a cluster display value to a positive integer string.
 * If maxCluster is provided, clamps the result to be <= maxCluster.
 * This ensures cluster display indices are valid for the current k value.
 */
const normalizeClusterDisplay = (
  clusterDisplay?: string | number,
  maxCluster?: number,
): string => {
  if (typeof clusterDisplay === "number") {
    const normalizedNumber = Math.max(1, Math.floor(clusterDisplay));
    if (maxCluster !== undefined) {
      return String(Math.min(normalizedNumber, maxCluster));
    }
    return String(normalizedNumber);
  }

  if (!clusterDisplay || !/^\d+$/.test(clusterDisplay)) {
    return DEFAULT_CLUSTER_DISPLAY;
  }

  const normalizedNumber = Math.max(1, Math.floor(Number(clusterDisplay)));
  if (maxCluster !== undefined) {
    return String(Math.min(normalizedNumber, maxCluster));
  }
  return String(normalizedNumber);
};

const parseBooleanValue = (value: string | undefined): boolean | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === "true" || normalizedValue === "1") {
    return true;
  }

  if (normalizedValue === "false" || normalizedValue === "0") {
    return false;
  }

  return undefined;
};

const toSearchParams = (
  input?: URLSearchParams | SearchParams,
): URLSearchParams => {
  if (!input) {
    return new URLSearchParams();
  }

  if (input instanceof URLSearchParams) {
    return new URLSearchParams(input.toString());
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      searchParams.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      const firstValue = value[0];
      if (typeof firstValue === "string") {
        searchParams.set(key, firstValue);
      }
    }
  }

  return searchParams;
};

export const serializeIllnessClusterNavigationQuery = (
  input: IllnessClusterNavigationQueryInput = {},
): string => {
  const variables = normalizeClusterVariables(
    input.variables,
    DEFAULT_CLUSTER_VARIABLES,
  );
  const k = clampClusterCount(input.k ?? DEFAULT_CLUSTER_COUNT);
  const searchParams = new URLSearchParams();

  searchParams.set("tab", normalizeMapTab(input.tab));
  searchParams.set("cluster", normalizeClusterDisplay(input.clusterDisplay, k));
  searchParams.set("k", String(k));
  searchParams.set("age", String(variables.age));
  searchParams.set("gender", String(variables.gender));
  searchParams.set("district", String(variables.district));
  searchParams.set("time", String(variables.time));

  const { startDate, endDate } = validateDateRange(
    input.startDate,
    input.endDate,
  );
  if (startDate && endDate) {
    searchParams.set("start_date", startDate);
    searchParams.set("end_date", endDate);
  }

  return searchParams.toString();
};

export const parseIllnessClusterNavigationQuery = (
  input?: URLSearchParams | SearchParams,
): IllnessClusterNavigationState => {
  const searchParams = toSearchParams(input);

  const variables = normalizeClusterVariables(
    {
      age: parseBooleanValue(searchParams.get("age") ?? undefined),
      gender: parseBooleanValue(searchParams.get("gender") ?? undefined),
      district: parseBooleanValue(searchParams.get("district") ?? undefined),
      time: parseBooleanValue(searchParams.get("time") ?? undefined),
    },
    DEFAULT_CLUSTER_VARIABLES,
  );

  const parsedK = Number(searchParams.get("k"));
  const k = clampClusterCount(parsedK, DEFAULT_CLUSTER_COUNT);

  const { startDate, endDate } = validateDateRange(
    searchParams.get("start_date") ?? undefined,
    searchParams.get("end_date") ?? undefined,
  );
  const hasCompleteDateRange = Boolean(startDate && endDate);

  return {
    tab: normalizeMapTab(searchParams.get("tab") ?? undefined),
    clusterDisplay: normalizeClusterDisplay(
      searchParams.get("cluster") ?? undefined,
      k,
    ),
    k,
    variables,
    startDate: hasCompleteDateRange ? startDate : undefined,
    endDate: hasCompleteDateRange ? endDate : undefined,
  };
};

export const buildIllnessClusterMapHref = (
  clusterDisplay: string | number,
  context: IllnessClusterMapNavigationContext = {},
): string => {
  const query = serializeIllnessClusterNavigationQuery({
    ...context,
    clusterDisplay,
  });

  return `/map?${query}`;
};
