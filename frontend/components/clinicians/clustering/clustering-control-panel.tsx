"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2, OctagonAlert, MapPin, X } from "lucide-react";
import DiagnosisDateFilter from "../dashboard-page/clustering/diagnosis-date-filter";
import ViewSelect from "../map-page/view-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIllnessClusterData } from "@/hooks/illness-cluster-hooks/use-illness-cluster-data";
import { useIllnessClusterRecommendation } from "@/hooks/illness-cluster-hooks/use-illness-cluster-recommendation";
import { useClusterDisplay } from "@/hooks/illness-cluster-hooks/use-cluster-display";
import {
  clampClusterCount,
  DEFAULT_CLUSTER_VARIABLES,
  normalizeClusterVariables,
  type ClusterVariableSelection,
  DEFAULT_CLUSTER_COUNT,
} from "@/types/illness-cluster-settings";
import {
  hasIllnessClusterNavigationQuery,
  parseIllnessClusterNavigationQuery,
  serializeIllnessClusterNavigationQuery,
} from "@/utils/illness-cluster-navigation";
import type { IllnessClusterData } from "@/types";
import useClusteringPreferencesStore from "@/stores/use-clustering-preferences-store";

type ClusteringPreferencesPersistApi = {
  hasHydrated?: () => boolean;
  onHydrate?: (listener: () => void) => (() => void) | void;
  onFinishHydration?: (listener: () => void) => (() => void) | void;
};

const getClusteringPreferencesPersistApi = ():
  | ClusteringPreferencesPersistApi
  | undefined => {
  const storeWithPersist =
    useClusteringPreferencesStore as typeof useClusteringPreferencesStore & {
      persist?: ClusteringPreferencesPersistApi;
    };

  return storeWithPersist.persist;
};

const HYDRATION_DEBUG_ENABLED = process.env.NODE_ENV === "development";

const debugHydration = (event: string, payload: Record<string, unknown>) => {
  if (!HYDRATION_DEBUG_ENABLED) {
    return;
  }

  console.debug(`[ClusteringHydration] ${event}`, payload);
};

const assertHydration = (
  condition: boolean,
  message: string,
  payload: Record<string, unknown>,
) => {
  if (!HYDRATION_DEBUG_ENABLED || condition) {
    return;
  }

  console.warn(`[ClusteringHydration] Assertion failed: ${message}`, payload);
};

const VARIABLE_LABELS: Record<keyof ClusterVariableSelection, string> = {
  age: "Age",
  gender: "Gender",
  district: "District",
  time: "Diagnosis date",
  riskLevel: "Risk level",
  symptomSeverity: "Symptom severity",
  comorbiditiesCount: "Comorbidities count",
};

const toVariableLabelList = (variables: ClusterVariableSelection) =>
  (Object.keys(variables) as Array<keyof ClusterVariableSelection>)
    .filter((key) => variables[key])
    .map((key) => VARIABLE_LABELS[key]);

const formatReadableList = (items: string[]) => {
  if (items.length === 0) {
    return "your selected variables";
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

type ClusterVariablePresetKey =
  | "recommended-default"
  | "outbreak-detection"
  | "high-risk-cases";

const CLUSTER_VARIABLE_PRESETS: Record<
  ClusterVariablePresetKey,
  {
    label: string;
    variables: ClusterVariableSelection;
  }
> = {
  "recommended-default": {
    label: "Recommended",
    variables: {
      ...DEFAULT_CLUSTER_VARIABLES,
      age: true,
      district: true,
      time: true,
      gender: false,
      riskLevel: false,
      symptomSeverity: false,
      comorbiditiesCount: false,
    },
  },
  "outbreak-detection": {
    label: "Outbreak detection",
    variables: {
      ...DEFAULT_CLUSTER_VARIABLES,
      district: true,
      time: true,
      riskLevel: true,
      symptomSeverity: true,
      comorbiditiesCount: false,
    },
  },
  "high-risk-cases": {
    label: "High-risk cases",
    variables: {
      ...DEFAULT_CLUSTER_VARIABLES,
      age: true,
      district: true,
      riskLevel: true,
      symptomSeverity: true,
      comorbiditiesCount: true,
      time: false,
    },
  },
};

// Date conversion utilities
const formatDateToString = (date: Date | null): string => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateFromString = (dateString?: string): Date | null => {
  if (!dateString) return null;
  const parsed = new Date(`${dateString}T00:00:00`);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const areVariablesEqual = (
  left: ClusterVariableSelection,
  right: ClusterVariableSelection,
): boolean => {
  return (
    left.age === right.age &&
    left.gender === right.gender &&
    left.district === right.district &&
    left.time === right.time &&
    left.riskLevel === right.riskLevel &&
    left.symptomSeverity === right.symptomSeverity &&
    left.comorbiditiesCount === right.comorbiditiesCount
  );
};

const areSameDateValue = (left: Date | null, right: Date | null): boolean => {
  return formatDateToString(left) === formatDateToString(right);
};

const buildRecommendationSignature = (
  variables: ClusterVariableSelection,
  startDate: string,
  endDate: string,
): string => {
  return [
    variables.age ? "1" : "0",
    variables.gender ? "1" : "0",
    variables.district ? "1" : "0",
    variables.time ? "1" : "0",
    variables.riskLevel ? "1" : "0",
    variables.symptomSeverity ? "1" : "0",
    variables.comorbiditiesCount ? "1" : "0",
    startDate,
    endDate,
  ].join("|");
};

type ControlPanelResolvedState = {
  source: "explicit-url" | "saved-preferences" | "defaults";
  k: number;
  recommendedK?: number;
  variables: ClusterVariableSelection;
  startDate?: string;
  endDate?: string;
  clusterDisplay: string;
};

const normalizeClusterDisplayValue = (
  clusterDisplay: string | undefined,
  maxCluster: number,
): string => {
  if (!clusterDisplay || !/^\d+$/.test(clusterDisplay)) {
    return "1";
  }

  const parsedClusterDisplay = Number(clusterDisplay);
  const normalizedValue = Math.max(1, Math.floor(parsedClusterDisplay));

  return String(Math.min(normalizedValue, maxCluster));
};

const resolveControlPanelState = ({
  hasExplicitClusterQuery,
  urlState,
  initialK,
  hasSavedPreferences,
  savedK,
  savedRecommendedK,
  savedVariables,
  savedStartDate,
  savedEndDate,
  savedClusterDisplay,
}: {
  hasExplicitClusterQuery: boolean;
  urlState: ReturnType<typeof parseIllnessClusterNavigationQuery>;
  initialK: number;
  hasSavedPreferences: boolean;
  savedK: number;
  savedRecommendedK?: number;
  savedVariables: ClusterVariableSelection;
  savedStartDate?: string;
  savedEndDate?: string;
  savedClusterDisplay?: string;
}): ControlPanelResolvedState => {
  if (hasExplicitClusterQuery) {
    return {
      source: "explicit-url",
      k: urlState.k,
      recommendedK: urlState.recommendedK,
      variables: { ...urlState.variables },
      startDate: urlState.startDate,
      endDate: urlState.endDate,
      clusterDisplay: normalizeClusterDisplayValue(
        urlState.clusterDisplay,
        urlState.k,
      ),
    };
  }

  if (hasSavedPreferences) {
    const normalizedK = clampClusterCount(
      savedK,
      clampClusterCount(initialK, DEFAULT_CLUSTER_COUNT),
    );
    const normalizedVariables = normalizeClusterVariables(
      savedVariables,
      DEFAULT_CLUSTER_VARIABLES,
    );

    return {
      source: "saved-preferences",
      k: normalizedK,
      recommendedK: savedRecommendedK,
      variables: normalizedVariables,
      startDate: savedStartDate,
      endDate: savedEndDate,
      clusterDisplay: normalizeClusterDisplayValue(
        savedClusterDisplay,
        normalizedK,
      ),
    };
  }

  const fallbackK = clampClusterCount(initialK, DEFAULT_CLUSTER_COUNT);
  const fallbackVariables = normalizeClusterVariables(
    urlState.variables,
    DEFAULT_CLUSTER_VARIABLES,
  );

  return {
    source: "defaults",
    k: fallbackK,
    recommendedK: urlState.recommendedK,
    variables: fallbackVariables,
    startDate: undefined,
    endDate: undefined,
    clusterDisplay: "1",
  };
};

export interface ClusteringControlPanelProps {
  enableViewToggle?: boolean;
  enableUrlSync?: boolean;
  showClusterSelector?: boolean;
  initialK?: number;
  onClusterDataChange?: (data: IllnessClusterData | null) => void;
  children?: (props: ClusteringControlPanelRenderProps) => React.ReactNode;
  externalDateRange?: { start: Date | null; end: Date | null };
}

export interface ClusteringControlPanelRenderProps {
  clusterData: IllnessClusterData | null;
  loading: boolean;
  error: string | null;
  selectedClusterDisplay: string;
  selectedClusterIndex: number;
  selectedClusterId: number;
  selectedClusterLabel: string;
  clusterDisplayOptions: Array<{ label: string; value: string }>;
  setSelectedClusterDisplay: (value: string) => void;
  view: "coordinates" | "district";
  setView: (value: "coordinates" | "district") => void;
  appliedVariables: ClusterVariableSelection;
  k: number;
  recommendedK?: number;
  appliedStartDate: string;
  appliedEndDate: string;
  exportButtonTarget: HTMLDivElement | null;
}

const ClusteringControlPanel: React.FC<ClusteringControlPanelProps> = ({
  enableViewToggle = false,
  enableUrlSync = true,
  showClusterSelector = true,
  initialK = DEFAULT_CLUSTER_COUNT,
  onClusterDataChange,
  children,
  externalDateRange,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    hasSavedPreferences,
    k: savedK,
    recommendedK: savedRecommendedK,
    variables: savedVariables,
    startDate: savedStartDate,
    endDate: savedEndDate,
    clusterDisplay: savedClusterDisplay,
    savePreferences,
  } = useClusteringPreferencesStore();
  const clusteringPreferencesPersistApi = getClusteringPreferencesPersistApi();

  const [hasHydratedPreferences, setHasHydratedPreferences] = useState<boolean>(
    () => {
      if (typeof window === "undefined") {
        return false;
      }

      return clusteringPreferencesPersistApi?.hasHydrated?.() ?? false;
    },
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const persistApi = getClusteringPreferencesPersistApi();
    if (!persistApi) {
      setHasHydratedPreferences(true);
      debugHydration("persist-api-missing", {});
      return;
    }

    const onHydrateStart = () => setHasHydratedPreferences(false);
    const onHydrateFinish = () => setHasHydratedPreferences(true);

    const unsubscribeOnHydrate = persistApi.onHydrate?.(() => {
      onHydrateStart();
      debugHydration("persist-hydration-start", {});
    });
    const unsubscribeOnFinishHydration = persistApi.onFinishHydration?.(() => {
      onHydrateFinish();
      debugHydration("persist-hydration-finish", {});
    });

    const hydrated = persistApi.hasHydrated?.() ?? false;
    setHasHydratedPreferences(hydrated);
    debugHydration("persist-hydration-check", { hydrated });

    return () => {
      if (typeof unsubscribeOnHydrate === "function") {
        unsubscribeOnHydrate();
      }
      if (typeof unsubscribeOnFinishHydration === "function") {
        unsubscribeOnFinishHydration();
      }
    };
  }, []);

  const hasExplicitClusterQuery = useMemo(
    () => hasIllnessClusterNavigationQuery(searchParams),
    [searchParams],
  );

  const parsedUrlState = useMemo(
    () => parseIllnessClusterNavigationQuery(searchParams),
    [searchParams],
  );

  const initialResolvedStateRef = useRef<ControlPanelResolvedState | null>(
    null,
  );

  if (!initialResolvedStateRef.current) {
    initialResolvedStateRef.current = resolveControlPanelState({
      hasExplicitClusterQuery,
      urlState: parsedUrlState,
      initialK,
      hasSavedPreferences,
      savedK,
      savedRecommendedK,
      savedVariables,
      savedStartDate,
      savedEndDate,
      savedClusterDisplay,
    });
  }

  const initialResolvedState = initialResolvedStateRef.current;

  // State management
  const [k, setK] = useState<number>(initialResolvedState.k);
  const [kInput, setKInput] = useState<string>(String(initialResolvedState.k));
  const [selectedVariables, setSelectedVariables] =
    useState<ClusterVariableSelection>(initialResolvedState.variables);
  const [appliedVariables, setAppliedVariables] =
    useState<ClusterVariableSelection>(initialResolvedState.variables);
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(
    parseDateFromString(initialResolvedState.startDate),
  );
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(
    parseDateFromString(initialResolvedState.endDate),
  );
  const [appliedDateRangeStart, setAppliedDateRangeStart] =
    useState<Date | null>(parseDateFromString(initialResolvedState.startDate));
  const [appliedDateRangeEnd, setAppliedDateRangeEnd] = useState<Date | null>(
    parseDateFromString(initialResolvedState.endDate),
  );
  const [selectedClusterDisplay, setSelectedClusterDisplay] = useState<string>(
    initialResolvedState.clusterDisplay,
  );
  const [view, setView] = useState<"coordinates" | "district">("coordinates");
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [pendingK, setPendingK] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [cachedRecommendedK, setCachedRecommendedK] = useState<
    number | undefined
  >(initialResolvedState.recommendedK);
  const [cachedRecommendationSignature, setCachedRecommendationSignature] =
    useState<string | null>(() => {
      if (typeof initialResolvedState.recommendedK !== "number") {
        return null;
      }

      return buildRecommendationSignature(
        initialResolvedState.variables,
        initialResolvedState.startDate ?? "",
        initialResolvedState.endDate ?? "",
      );
    });

  const lastSyncedUrlRef = useRef<string>("");
  const hasAppliedHydratedPreferencesRef = useRef<boolean>(false);
  const hasSkippedInitialPreferenceSyncRef = useRef<boolean>(false);
  const hasCompletedInitialUrlHydrationRef = useRef<boolean>(
    !hasExplicitClusterQuery,
  );
  const [exportButtonTarget, setExportButtonTarget] =
    useState<HTMLDivElement | null>(null);
  const [showVariableHelp, setShowVariableHelp] = useState(false);
  const [isAdvancedOptionsEnabled, setIsAdvancedOptionsEnabled] =
    useState<boolean>(false);

  const syncCachedRecommendation = useCallback(
    (params: {
      recommendedK?: number;
      variables: ClusterVariableSelection;
      startDate?: string;
      endDate?: string;
    }) => {
      if (typeof params.recommendedK !== "number") {
        setCachedRecommendedK((previousValue) =>
          typeof previousValue === "undefined" ? previousValue : undefined,
        );
        setCachedRecommendationSignature((previousSignature) =>
          previousSignature === null ? previousSignature : null,
        );
        return;
      }

      const nextSignature = buildRecommendationSignature(
        params.variables,
        params.startDate ?? "",
        params.endDate ?? "",
      );

      setCachedRecommendedK((previousValue) =>
        previousValue === params.recommendedK
          ? previousValue
          : params.recommendedK,
      );
      setCachedRecommendationSignature((previousSignature) =>
        previousSignature === nextSignature ? previousSignature : nextSignature,
      );
    },
    [],
  );

  useEffect(() => {
    if (
      externalDateRange &&
      (!areSameDateValue(appliedDateRangeStart, externalDateRange.start) ||
        !areSameDateValue(appliedDateRangeEnd, externalDateRange.end))
    ) {
      setAppliedDateRangeStart(externalDateRange.start);
      setAppliedDateRangeEnd(externalDateRange.end);
      setDateRangeStart(externalDateRange.start);
      setDateRangeEnd(externalDateRange.end);
    }
  }, [externalDateRange, appliedDateRangeStart, appliedDateRangeEnd]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    debugHydration("initial-state-resolved", {
      source: initialResolvedState.source,
      k: initialResolvedState.k,
      clusterDisplay: initialResolvedState.clusterDisplay,
      hasStartDate: Boolean(initialResolvedState.startDate),
      hasEndDate: Boolean(initialResolvedState.endDate),
      variables: initialResolvedState.variables,
    });
  }, [
    initialResolvedState.source,
    initialResolvedState.k,
    initialResolvedState.clusterDisplay,
    initialResolvedState.startDate,
    initialResolvedState.endDate,
    initialResolvedState.variables,
  ]);

  useEffect(() => {
    hasCompletedInitialUrlHydrationRef.current = !hasExplicitClusterQuery;
    debugHydration("url-hydration-gate", {
      hasExplicitClusterQuery,
      allowOutboundUrlSync: hasCompletedInitialUrlHydrationRef.current,
      query: searchParams.toString(),
    });
  }, [hasExplicitClusterQuery, searchParams]);

  // Convert dates to string format for hooks
  const draftStartDateString = formatDateToString(dateRangeStart);
  const draftEndDateString = formatDateToString(dateRangeEnd);
  const startDateString = formatDateToString(appliedDateRangeStart);
  const endDateString = formatDateToString(appliedDateRangeEnd);

  const draftRecommendationSignature = useMemo(
    () =>
      buildRecommendationSignature(
        selectedVariables,
        draftStartDateString,
        draftEndDateString,
      ),
    [selectedVariables, draftStartDateString, draftEndDateString],
  );

  const appliedRecommendationSignature = useMemo(
    () =>
      buildRecommendationSignature(
        appliedVariables,
        startDateString,
        endDateString,
      ),
    [appliedVariables, startDateString, endDateString],
  );

  const hasCachedRecommendationForDraft =
    typeof cachedRecommendedK === "number" &&
    cachedRecommendationSignature === draftRecommendationSignature;

  const shouldFetchRecommendation = !hasCachedRecommendationForDraft;

  const recommendedKForAppliedState =
    typeof cachedRecommendedK === "number" &&
    cachedRecommendationSignature === appliedRecommendationSignature
      ? cachedRecommendedK
      : undefined;

  // Use custom hooks for data fetching
  const {
    recommendedK: fetchedRecommendedK,
    loading: loadingRecommendation,
    message: recommendationMessage,
  } = useIllnessClusterRecommendation({
    variables: selectedVariables,
    startDate: draftStartDateString,
    endDate: draftEndDateString,
    enabled: shouldFetchRecommendation,
  });

  const displayedRecommendedK = hasCachedRecommendationForDraft
    ? cachedRecommendedK
    : fetchedRecommendedK;

  const { clusterData, loading, error } = useIllnessClusterData({
    k,
    variables: appliedVariables,
    startDate: startDateString,
    endDate: endDateString,
  });

  const {
    clusterDisplayOptions,
    selectedClusterIndex,
    selectedClusterId,
    selectedClusterLabel,
  } = useClusterDisplay(
    clusterData,
    selectedClusterDisplay,
    setSelectedClusterDisplay,
  );

  useEffect(() => {
    if (clusterDisplayOptions.length === 0) {
      return;
    }

    const currentClusterDisplay = Number(selectedClusterDisplay);
    assertHydration(
      !Number.isNaN(currentClusterDisplay) &&
        currentClusterDisplay >= 1 &&
        currentClusterDisplay <= clusterDisplayOptions.length,
      "selected group display is out of bounds",
      {
        selectedClusterDisplay,
        clusterOptionCount: clusterDisplayOptions.length,
        hasExplicitClusterQuery,
      },
    );
  }, [selectedClusterDisplay, clusterDisplayOptions, hasExplicitClusterQuery]);

  // Notify parent of cluster data changes
  useEffect(() => {
    if (onClusterDataChange) {
      onClusterDataChange(clusterData);
    }
  }, [clusterData, onClusterDataChange]);

  useEffect(() => {
    if (!shouldFetchRecommendation || loadingRecommendation) {
      return;
    }

    if (fetchedRecommendedK === null) {
      return;
    }

    setCachedRecommendedK((previousRecommendedK) =>
      previousRecommendedK === fetchedRecommendedK
        ? previousRecommendedK
        : fetchedRecommendedK,
    );
    setCachedRecommendationSignature((previousSignature) =>
      previousSignature === draftRecommendationSignature
        ? previousSignature
        : draftRecommendationSignature,
    );
  }, [
    shouldFetchRecommendation,
    loadingRecommendation,
    fetchedRecommendedK,
    draftRecommendationSignature,
  ]);

  // Sync recommendation to input for basic flow.
  useEffect(() => {
    if (!isAdvancedOptionsEnabled && displayedRecommendedK) {
      setKInput(String(displayedRecommendedK));
    }
  }, [displayedRecommendedK, isAdvancedOptionsEnabled]);

  // Rehydrate from persisted preferences when URL has no explicit clustering state.
  useEffect(() => {
    if (hasExplicitClusterQuery) {
      hasAppliedHydratedPreferencesRef.current = true;
      return;
    }

    if (!hasHydratedPreferences || !hasSavedPreferences) {
      return;
    }

    if (hasAppliedHydratedPreferencesRef.current) {
      return;
    }

    hasAppliedHydratedPreferencesRef.current = true;

    const persistedState = resolveControlPanelState({
      hasExplicitClusterQuery: false,
      urlState: parsedUrlState,
      initialK,
      hasSavedPreferences,
      savedK,
      savedRecommendedK,
      savedVariables,
      savedStartDate,
      savedEndDate,
      savedClusterDisplay,
    });

    const nextStartDate = parseDateFromString(persistedState.startDate);
    const nextEndDate = parseDateFromString(persistedState.endDate);
    const nextKInput = String(persistedState.k);

    debugHydration("persisted-rehydrate-apply", {
      k: persistedState.k,
      clusterDisplay: persistedState.clusterDisplay,
      hasDateRange: Boolean(persistedState.startDate && persistedState.endDate),
      variables: persistedState.variables,
    });

    setK((previousK) =>
      previousK === persistedState.k ? previousK : persistedState.k,
    );
    setKInput((previousKInput) =>
      previousKInput === nextKInput ? previousKInput : nextKInput,
    );
    setSelectedVariables((previousVariables) =>
      areVariablesEqual(previousVariables, persistedState.variables)
        ? previousVariables
        : persistedState.variables,
    );
    setAppliedVariables((previousVariables) =>
      areVariablesEqual(previousVariables, persistedState.variables)
        ? previousVariables
        : persistedState.variables,
    );
    setSelectedClusterDisplay((previousClusterDisplay) =>
      previousClusterDisplay === persistedState.clusterDisplay
        ? previousClusterDisplay
        : persistedState.clusterDisplay,
    );
    setDateRangeStart((previousDate) =>
      areSameDateValue(previousDate, nextStartDate)
        ? previousDate
        : nextStartDate,
    );
    setDateRangeEnd((previousDate) =>
      areSameDateValue(previousDate, nextEndDate) ? previousDate : nextEndDate,
    );
    setAppliedDateRangeStart((previousDate) =>
      areSameDateValue(previousDate, nextStartDate)
        ? previousDate
        : nextStartDate,
    );
    setAppliedDateRangeEnd((previousDate) =>
      areSameDateValue(previousDate, nextEndDate) ? previousDate : nextEndDate,
    );
    syncCachedRecommendation({
      recommendedK: persistedState.recommendedK,
      variables: persistedState.variables,
      startDate: persistedState.startDate,
      endDate: persistedState.endDate,
    });
  }, [
    hasExplicitClusterQuery,
    hasHydratedPreferences,
    hasSavedPreferences,
    parsedUrlState,
    initialK,
    savedK,
    savedRecommendedK,
    savedVariables,
    savedStartDate,
    savedEndDate,
    savedClusterDisplay,
    syncCachedRecommendation,
  ]);

  // URL sync effect (if enabled)
  useEffect(() => {
    if (!enableUrlSync || !clusterData) {
      return;
    }

    if (!hasCompletedInitialUrlHydrationRef.current) {
      debugHydration("url-sync-outbound-waiting-for-inbound", {
        explicitClusterQuery: hasExplicitClusterQuery,
      });
      return;
    }

    const nextQuery = serializeIllnessClusterNavigationQuery({
      k,
      recommendedK: recommendedKForAppliedState,
      variables: appliedVariables,
      startDate: startDateString || undefined,
      endDate: endDateString || undefined,
      clusterDisplay: selectedClusterDisplay,
    });

    if (nextQuery === searchParams.toString()) {
      return;
    }

    const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    debugHydration("url-sync-outbound-replace", {
      previousQuery: searchParams.toString(),
      nextQuery,
      selectedClusterDisplay,
      k,
      recommendedK: recommendedKForAppliedState,
    });
    lastSyncedUrlRef.current = nextQuery;
    router.replace(nextHref, { scroll: false });
  }, [
    enableUrlSync,
    k,
    appliedVariables,
    startDateString,
    endDateString,
    selectedClusterDisplay,
    clusterData,
    pathname,
    router,
    searchParams,
    hasExplicitClusterQuery,
    recommendedKForAppliedState,
  ]);

  // Sync incoming URL parameters when explicit clustering query values exist.
  useEffect(() => {
    if (!hasExplicitClusterQuery) {
      return;
    }

    const currentUrl = searchParams.toString();
    if (currentUrl === lastSyncedUrlRef.current) {
      hasCompletedInitialUrlHydrationRef.current = true;
      return;
    }

    lastSyncedUrlRef.current = currentUrl;
    const normalizedVariables = { ...parsedUrlState.variables };
    const nextKInput = String(parsedUrlState.k);
    const normalizedClusterDisplay = normalizeClusterDisplayValue(
      parsedUrlState.clusterDisplay,
      parsedUrlState.k,
    );

    debugHydration("url-sync-inbound-apply", {
      currentUrl,
      normalizedClusterDisplay,
      k: parsedUrlState.k,
      hasDateRange: Boolean(parsedUrlState.startDate && parsedUrlState.endDate),
      variables: normalizedVariables,
    });

    setK((previousK) =>
      previousK === parsedUrlState.k ? previousK : parsedUrlState.k,
    );
    setKInput((previousKInput) =>
      previousKInput === nextKInput ? previousKInput : nextKInput,
    );
    setSelectedVariables((previousVariables) =>
      areVariablesEqual(previousVariables, normalizedVariables)
        ? previousVariables
        : normalizedVariables,
    );
    setAppliedVariables((previousVariables) =>
      areVariablesEqual(previousVariables, normalizedVariables)
        ? previousVariables
        : normalizedVariables,
    );
    setSelectedClusterDisplay((previousClusterDisplay) =>
      previousClusterDisplay === normalizedClusterDisplay
        ? previousClusterDisplay
        : normalizedClusterDisplay,
    );

    const nextStartDate = parseDateFromString(parsedUrlState.startDate);
    const nextEndDate = parseDateFromString(parsedUrlState.endDate);
    setDateRangeStart((previousDate) =>
      areSameDateValue(previousDate, nextStartDate)
        ? previousDate
        : nextStartDate,
    );
    setDateRangeEnd((previousDate) =>
      areSameDateValue(previousDate, nextEndDate) ? previousDate : nextEndDate,
    );
    setAppliedDateRangeStart((previousDate) =>
      areSameDateValue(previousDate, nextStartDate)
        ? previousDate
        : nextStartDate,
    );
    setAppliedDateRangeEnd((previousDate) =>
      areSameDateValue(previousDate, nextEndDate) ? previousDate : nextEndDate,
    );

    syncCachedRecommendation({
      recommendedK: parsedUrlState.recommendedK,
      variables: normalizedVariables,
      startDate: parsedUrlState.startDate,
      endDate: parsedUrlState.endDate,
    });

    savePreferences({
      k: parsedUrlState.k,
      recommendedK: parsedUrlState.recommendedK,
      variables: normalizedVariables,
      startDate: parsedUrlState.startDate,
      endDate: parsedUrlState.endDate,
      clusterDisplay: normalizedClusterDisplay,
    });

    hasCompletedInitialUrlHydrationRef.current = true;
  }, [
    searchParams,
    hasExplicitClusterQuery,
    parsedUrlState,
    savePreferences,
    syncCachedRecommendation,
  ]);

  // Persist the latest applied clustering state for non-URL-based navigation.
  useEffect(() => {
    if (!hasHydratedPreferences) {
      return;
    }

    if (!hasSkippedInitialPreferenceSyncRef.current) {
      hasSkippedInitialPreferenceSyncRef.current = true;

      // Avoid storing defaults on first mount when URL does not explicitly carry clustering state.
      if (!hasExplicitClusterQuery) {
        return;
      }
    }

    savePreferences({
      k,
      recommendedK: recommendedKForAppliedState,
      variables: appliedVariables,
      startDate: startDateString || undefined,
      endDate: endDateString || undefined,
      clusterDisplay: selectedClusterDisplay,
    });

    debugHydration("persisted-save-applied-state", {
      k,
      recommendedK: recommendedKForAppliedState,
      clusterDisplay: selectedClusterDisplay,
      hasDateRange: Boolean(startDateString && endDateString),
      variables: appliedVariables,
    });
  }, [
    hasHydratedPreferences,
    hasExplicitClusterQuery,
    savePreferences,
    k,
    recommendedKForAppliedState,
    appliedVariables,
    startDateString,
    endDateString,
    selectedClusterDisplay,
  ]);

  const clampK = useCallback(
    (val: number) => {
      return clampClusterCount(val, k);
    },
    [k],
  );

  const handleVariableChange = useCallback(
    (variable: keyof ClusterVariableSelection) => {
      const selectedCount =
        Object.values(selectedVariables).filter(Boolean).length;

      if (selectedVariables[variable] && selectedCount === 1) {
        return;
      }

      setSelectedVariables((prev) => ({
        ...prev,
        [variable]: !prev[variable],
      }));
    },
    [selectedVariables],
  );

  const handleApplyPreset = useCallback((preset: ClusterVariablePresetKey) => {
    setSelectedVariables({ ...CLUSTER_VARIABLE_PRESETS[preset].variables });
  }, []);

  const applyClusteringWithK = useCallback(
    (clusterCount: number) => {
      const nextK = clampK(clusterCount);
      const nextVariables = { ...selectedVariables };
      const nextDateRangeStart = dateRangeStart;
      const nextDateRangeEnd = dateRangeEnd;

      setK(nextK);
      setKInput(String(nextK));
      setAppliedVariables(nextVariables);
      setAppliedDateRangeStart(nextDateRangeStart);
      setAppliedDateRangeEnd(nextDateRangeEnd);
    },
    [clampK, selectedVariables, dateRangeStart, dateRangeEnd],
  );

  const onSubmitK = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const nextBasicK = clampK(displayedRecommendedK ?? k);
      const nextAdvancedK = clampK(parseInt(kInput, 10));
      const nextK = isAdvancedOptionsEnabled ? nextAdvancedK : nextBasicK;

      const hasPendingGroupCountChange = nextK !== k;
      const hasPendingVariableChange = (
        Object.keys(selectedVariables) as Array<keyof ClusterVariableSelection>
      ).some((key) => selectedVariables[key] !== appliedVariables[key]);
      const hasPendingDateRangeChange =
        draftStartDateString !== startDateString ||
        draftEndDateString !== endDateString;

      if (
        !hasPendingGroupCountChange &&
        !hasPendingVariableChange &&
        !hasPendingDateRangeChange
      ) {
        return;
      }

      if (loadingRecommendation && !displayedRecommendedK) {
        setPendingK(nextK);
        setShowConfirmModal(true);
        return;
      }

      applyClusteringWithK(nextK);
    },
    [
      kInput,
      k,
      selectedVariables,
      appliedVariables,
      draftStartDateString,
      draftEndDateString,
      startDateString,
      endDateString,
      loadingRecommendation,
      clampK,
      applyClusteringWithK,
      displayedRecommendedK,
      isAdvancedOptionsEnabled,
    ],
  );

  const handleConfirmModal = useCallback(() => {
    if (pendingK !== null) {
      applyClusteringWithK(pendingK);
    }
    setShowConfirmModal(false);
    setPendingK(null);
  }, [pendingK, applyClusteringWithK]);

  const handleCancelModal = useCallback(() => {
    setShowConfirmModal(false);
    setPendingK(null);
  }, []);

  const handleDateRangeChange = useCallback(
    (start: Date | null, end: Date | null) => {
      setDateRangeStart(start);
      setDateRangeEnd(end);
    },
    [],
  );

  const appliedVariableSummary = useMemo(
    () => formatReadableList(toVariableLabelList(appliedVariables)),
    [appliedVariables],
  );

  const hasPendingVariableChanges = useMemo(
    () =>
      (
        Object.keys(selectedVariables) as Array<keyof ClusterVariableSelection>
      ).some((key) => selectedVariables[key] !== appliedVariables[key]),
    [selectedVariables, appliedVariables],
  );

  const hasPendingDateRangeChanges = useMemo(
    () =>
      formatDateToString(dateRangeStart) !==
        formatDateToString(appliedDateRangeStart) ||
      formatDateToString(dateRangeEnd) !==
        formatDateToString(appliedDateRangeEnd),
    [dateRangeStart, dateRangeEnd, appliedDateRangeStart, appliedDateRangeEnd],
  );

  const hasPendingFilterChanges =
    hasPendingVariableChanges || hasPendingDateRangeChanges;

  const hasPendingGroupCountChange = useMemo(() => {
    const normalizedInputK = isAdvancedOptionsEnabled
      ? clampK(parseInt(kInput, 10))
      : clampK(displayedRecommendedK ?? k);

    return normalizedInputK !== k;
  }, [kInput, k, clampK, displayedRecommendedK, isAdvancedOptionsEnabled]);

  const hasPendingClusteringChanges =
    hasPendingFilterChanges || hasPendingGroupCountChange;

  useEffect(() => {
    if (isAdvancedOptionsEnabled || !hasPendingFilterChanges) {
      return;
    }

    if (loadingRecommendation) {
      return;
    }

    if (typeof displayedRecommendedK !== "number") {
      return;
    }

    const nextK = clampK(displayedRecommendedK);
    applyClusteringWithK(nextK);
  }, [
    isAdvancedOptionsEnabled,
    hasPendingFilterChanges,
    loadingRecommendation,
    displayedRecommendedK,
    clampK,
    applyClusteringWithK,
  ]);

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

  const isGlobalLoading =
    loading || (loadingRecommendation && !displayedRecommendedK);

  const renderProps: ClusteringControlPanelRenderProps = {
    clusterData,
    loading: isGlobalLoading,
    error,
    selectedClusterDisplay,
    selectedClusterIndex,
    selectedClusterId,
    selectedClusterLabel,
    clusterDisplayOptions,
    setSelectedClusterDisplay,
    view,
    setView,
    appliedVariables,
    k,
    recommendedK: recommendedKForAppliedState,
    appliedStartDate: startDateString,
    appliedEndDate: endDateString,
    exportButtonTarget,
  };

  return (
    <div className="space-y-6">
      <div className="card card-body bg-base-200 border-base-300 border p-4 sm:p-6 sm:px-8">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 xl:gap-4 relative">
          <form
            onSubmit={onSubmitK}
            className="flex flex-col gap-4 w-full xl:w-auto"
          >
            {/* Variable Selection */}
            <div>
              <div className="flex items-start gap-2">
                <h2 className="text-base font-semibold leading-7">
                  Select variables
                </h2>
                {!showVariableHelp ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-circle"
                    aria-label="Show variable selection help"
                    onClick={() => setShowVariableHelp(true)}
                  >
                    ?
                  </button>
                ) : null}
                {showVariableHelp ? (
                  <div className="rounded-lg border border-base-300 bg-base-100 px-3 py-2 shadow-sm max-w-md text-xs leading-relaxed flex items-start justify-between gap-2">
                    <span>
                      Use <strong>Recommended</strong> for the fastest setup.
                      Adjust only if you need a specific investigation focus.
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-circle shrink-0"
                      aria-label="Close variable selection help"
                      onClick={() => setShowVariableHelp(false)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-base-content/70">Presets:</span>
                  {(
                    Object.keys(
                      CLUSTER_VARIABLE_PRESETS,
                    ) as ClusterVariablePresetKey[]
                  ).map((presetKey) => (
                    <button
                      key={presetKey}
                      type="button"
                      className={`btn btn-sm ${areVariablesEqual(selectedVariables, CLUSTER_VARIABLE_PRESETS[presetKey].variables) ? "btn-primary" : "btn-outline"}`}
                      title={
                        presetKey === "recommended-default"
                          ? "Balanced baseline for most cases: Age, District, and Diagnosis date"
                          : presetKey === "outbreak-detection"
                            ? "Focuses on spread patterns using District, Diagnosis date, Risk level, and Symptom severity"
                            : "Prioritizes vulnerable cases using Age, District, Risk level, Symptom severity, and Comorbidities"
                      }
                      onClick={() => handleApplyPreset(presetKey)}
                    >
                      <span className="mr-1.5">
                        {presetKey === "recommended-default" ? (
                          <AlertCircle className="h-3 h-3" />
                        ) : presetKey === "outbreak-detection" ? (
                          <AlertCircle className="h-3 h-3" />
                        ) : presetKey === "high-risk-cases" ? (
                          <OctagonAlert className="h-3 h-3" />
                        ) : (
                          <MapPin className="h-3 h-3" />
                        )}
                      </span>
                      {CLUSTER_VARIABLE_PRESETS[presetKey].label}
                    </button>
                  ))}
                </div>
                <div className="w-full">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm px-2"
                    onClick={() =>
                      setIsAdvancedOptionsEnabled(
                        (previousValue) => !previousValue,
                      )
                    }
                  >
                    {isAdvancedOptionsEnabled
                      ? "Hide advanced options"
                      : "Show advanced options"}
                  </button>
                </div>

                {isAdvancedOptionsEnabled ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 w-full">
                    <div className="card card-body bg-base-100 border-base-300 border p-3">
                      <span className="text-xs font-semibold">
                        Demographics
                      </span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <label
                          className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.age ? "btn-primary" : "btn-outline"}`}
                          title="Patient's age helps identify vulnerable populations like children and older adults"
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={selectedVariables.age}
                            onChange={() => handleVariableChange("age")}
                          />
                          <span className="whitespace-nowrap">Age</span>
                        </label>
                        <label
                          className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.gender ? "btn-primary" : "btn-outline"}`}
                          title="Patient sex can reveal differences in affected groups"
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={selectedVariables.gender}
                            onChange={() => handleVariableChange("gender")}
                          />
                          <span className="whitespace-nowrap">Gender</span>
                        </label>
                        <label
                          className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.district ? "btn-primary" : "btn-outline"}`}
                          title="District helps identify where cases are concentrating"
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={selectedVariables.district}
                            onChange={() => handleVariableChange("district")}
                          />
                          <span className="whitespace-nowrap">District</span>
                        </label>
                      </div>
                    </div>

                    <div className="card card-body bg-base-100 border-base-300 border p-3">
                      <span className="text-xs font-semibold">Clinical</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <label
                          className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.riskLevel ? "btn-primary" : "btn-outline"}`}
                          title="Risk level helps prioritize urgent cases"
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={selectedVariables.riskLevel}
                            onChange={() => handleVariableChange("riskLevel")}
                          />
                          <span className="whitespace-nowrap">Risk level</span>
                        </label>
                        <label
                          className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.symptomSeverity ? "btn-primary" : "btn-outline"}`}
                          title="Symptom severity shows how intense symptoms are"
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={selectedVariables.symptomSeverity}
                            onChange={() =>
                              handleVariableChange("symptomSeverity")
                            }
                          />
                          <span className="whitespace-nowrap">
                            Symptom severity
                          </span>
                        </label>
                        <label
                          className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.comorbiditiesCount ? "btn-primary" : "btn-outline"}`}
                          title="Other health conditions may increase complications"
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={selectedVariables.comorbiditiesCount}
                            onChange={() =>
                              handleVariableChange("comorbiditiesCount")
                            }
                          />
                          <span className="whitespace-nowrap">
                            Comorbidities count
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="card card-body bg-base-100 border-base-300 border p-3">
                      <span className="text-xs font-semibold">Temporal</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <label
                          className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.time ? "btn-primary" : "btn-outline"}`}
                          title="Diagnosis date helps detect timing and trend changes"
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={selectedVariables.time}
                            onChange={() => handleVariableChange("time")}
                          />
                          <span className="whitespace-nowrap">
                            Diagnosis date
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Date Filter and View Toggle */}
            <div className="flex flex-col gap-3">
              {enableViewToggle ? (
                <ViewSelect value={view} onValueChange={setView} />
              ) : null}
              {externalDateRange === undefined ? (
                <DiagnosisDateFilter
                  currentStartDate={dateRangeStart}
                  currentEndDate={dateRangeEnd}
                  onDateRangeChange={handleDateRangeChange}
                  loading={loading}
                />
              ) : null}

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 h-5">
                <span className="text-muted flex items-center gap-1.5 text-xs font-normal">
                  {!isGlobalLoading && displayedRecommendedK ? (
                    <>Recommended: {displayedRecommendedK} groups</>
                  ) : !isGlobalLoading ? (
                    <>Recommended: Current group count ({k})</>
                  ) : null}
                </span>

                {!isGlobalLoading && recommendationMessage ? (
                  <span className="text-warning text-xs font-medium w-full sm:w-auto">
                    {recommendationMessage}
                  </span>
                ) : null}
              </div>

              {isAdvancedOptionsEnabled ? (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <label htmlFor="cluster-k-input" className="text-xs">
                    Groups:
                  </label>
                  <Input
                    id="cluster-k-input"
                    type="number"
                    className="input h-7 w-17 text-xs font-medium"
                    min={2}
                    max={25}
                    value={kInput}
                    onChange={(e) => setKInput(e.target.value)}
                    disabled={loading}
                  />
                </div>
              ) : null}

              {/* Description */}
              <div className="text-muted text-xs font-normal w-full max-w-full overflow-hidden text-ellipsis">
                <span>
                  These groups are currently based on{" "}
                  <span className="font-medium">{appliedVariableSummary}</span>.
                  Patients with similar details in these areas are placed in the
                  same group
                </span>
                {hasPendingClusteringChanges && isAdvancedOptionsEnabled ? (
                  <div className="alert alert-warning mt-4 py-2 text-xs">
                    <AlertCircle className="size-4" />
                    <span>
                      The groups have not been updated. Click Apply to rebuild
                      the groups using the updated settings.
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Apply Button */}
              {isAdvancedOptionsEnabled ? (
                <div>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm w-fit mt-1"
                    title="Apply group settings"
                    disabled={loading || !hasPendingClusteringChanges}
                  >
                    {loading ? "Applying..." : "Apply"}
                  </button>
                </div>
              ) : null}
            </div>
          </form>

          {/* Total Diagnoses Counter */}
          <div className="space-y-1 text-left xl:text-right mt-4 xl:mt-0 pt-4 xl:pt-0 border-t border-base-200 xl:border-none w-full xl:w-auto flex flex-col items-start xl:items-end">
            <div className="text-4xl sm:text-5xl font-semibold tracking-tight tabular-nums text-primary">
              {clusterData?.total_illnesses.toLocaleString() ?? "N/A"}
            </div>
            <div className="text-muted text-sm font-medium">Diagnoses</div>
          </div>
        </div>
      </div>

      {/* Cluster Selection Dropdown */}
      {showClusterSelector &&
      !isGlobalLoading &&
      clusterDisplayOptions.length > 0 ? (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-base-content/70">
            Select group:
          </span>
          <Select
            value={selectedClusterDisplay}
            onValueChange={(value) => setSelectedClusterDisplay(value)}
            className="w-auto"
          >
            <SelectTrigger className="w-65">
              <SelectValue placeholder="Select group" />
            </SelectTrigger>
            <SelectContent>
              {clusterDisplayOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div ref={setExportButtonTarget} className="ml-auto" />
        </div>
      ) : null}

      {/* Error Display */}
      {!isGlobalLoading && error ? (
        <div className="alert alert-error">
          <AlertCircle className="size-5" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Children render prop */}
      {children && children(renderProps)}

      {/* Confirm Modal */}
      {modalRoot ? createPortal(confirmModal, modalRoot) : null}
    </div>
  );
};

export default ClusteringControlPanel;
