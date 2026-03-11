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
import { AlertCircle, Loader2 } from "lucide-react";
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
  const storeWithPersist = useClusteringPreferencesStore as typeof useClusteringPreferencesStore & {
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
    left.time === right.time
  );
};

const areSameDateValue = (left: Date | null, right: Date | null): boolean => {
  return formatDateToString(left) === formatDateToString(right);
};

type ControlPanelResolvedState = {
  source: "explicit-url" | "saved-preferences" | "defaults";
  k: number;
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
  savedVariables: ClusterVariableSelection;
  savedStartDate?: string;
  savedEndDate?: string;
  savedClusterDisplay?: string;
}): ControlPanelResolvedState => {
  if (hasExplicitClusterQuery) {
    return {
      source: "explicit-url",
      k: urlState.k,
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
  appliedStartDate: string;
  appliedEndDate: string;
}

const ClusteringControlPanel: React.FC<ClusteringControlPanelProps> = ({
  enableViewToggle = false,
  enableUrlSync = true,
  showClusterSelector = true,
  initialK = DEFAULT_CLUSTER_COUNT,
  onClusterDataChange,
  children,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    hasSavedPreferences,
    k: savedK,
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
      savedVariables,
      savedStartDate,
      savedEndDate,
      savedClusterDisplay,
    });
  }

  const initialResolvedState = initialResolvedStateRef.current;

  // State management
  const [k, setK] = useState<number>(initialResolvedState.k);
  const [kInput, setKInput] = useState<string>(
    String(initialResolvedState.k),
  );
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
    useState<Date | null>(
      parseDateFromString(initialResolvedState.startDate),
    );
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

  const lastSyncedUrlRef = useRef<string>("");
  const hasAppliedHydratedPreferencesRef = useRef<boolean>(false);
  const hasSkippedInitialPreferenceSyncRef = useRef<boolean>(false);
  const hasCompletedInitialUrlHydrationRef = useRef<boolean>(
    !hasExplicitClusterQuery,
  );

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
  const startDateString = formatDateToString(appliedDateRangeStart);
  const endDateString = formatDateToString(appliedDateRangeEnd);

  // Use custom hooks for data fetching
  const {
    recommendedK,
    loading: loadingRecommendation,
    message: recommendationMessage,
  } = useIllnessClusterRecommendation({
    variables: selectedVariables,
    startDate: formatDateToString(dateRangeStart),
    endDate: formatDateToString(dateRangeEnd),
  });

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
      "selected cluster display is out of bounds",
      {
        selectedClusterDisplay,
        clusterOptionCount: clusterDisplayOptions.length,
        hasExplicitClusterQuery,
      },
    );
  }, [
    selectedClusterDisplay,
    clusterDisplayOptions,
    hasExplicitClusterQuery,
  ]);

  // Notify parent of cluster data changes
  useEffect(() => {
    if (onClusterDataChange) {
      onClusterDataChange(clusterData);
    }
  }, [clusterData, onClusterDataChange]);

  // Sync recommendation to input
  useEffect(() => {
    if (recommendedK) {
      setKInput(String(recommendedK));
    }
  }, [recommendedK]);

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
      hasDateRange: Boolean(
        persistedState.startDate && persistedState.endDate,
      ),
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
  }, [
    hasExplicitClusterQuery,
    hasHydratedPreferences,
    hasSavedPreferences,
    parsedUrlState,
    initialK,
    savedK,
    savedVariables,
    savedStartDate,
    savedEndDate,
    savedClusterDisplay,
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

    savePreferences({
      k: parsedUrlState.k,
      variables: normalizedVariables,
      startDate: parsedUrlState.startDate,
      endDate: parsedUrlState.endDate,
      clusterDisplay: normalizedClusterDisplay,
    });

    hasCompletedInitialUrlHydrationRef.current = true;
  }, [searchParams, hasExplicitClusterQuery, parsedUrlState, savePreferences]);

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
      variables: appliedVariables,
      startDate: startDateString || undefined,
      endDate: endDateString || undefined,
      clusterDisplay: selectedClusterDisplay,
    });

    debugHydration("persisted-save-applied-state", {
      k,
      clusterDisplay: selectedClusterDisplay,
      hasDateRange: Boolean(startDateString && endDateString),
      variables: appliedVariables,
    });
  }, [
    hasHydratedPreferences,
    hasExplicitClusterQuery,
    savePreferences,
    k,
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
      const nextK = clampK(parseInt(kInput, 10));

      if (loadingRecommendation) {
        setPendingK(nextK);
        setShowConfirmModal(true);
        return;
      }

      applyClusteringWithK(nextK);
    },
    [kInput, loadingRecommendation, clampK, applyClusteringWithK],
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

  const renderProps: ClusteringControlPanelRenderProps = {
    clusterData,
    loading,
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
    appliedStartDate: startDateString,
    appliedEndDate: endDateString,
  };

  return (
    <>
      <div className="card card-body bg-base-100 border-base-300 border">
        <div className="flex items-start justify-between">
          <form onSubmit={onSubmitK} className="flex flex-col gap-4">
            {/* Variable Selection */}
            <div>
              <h2 className="text-base font-semibold">Select variables</h2>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                <div className="flex items-center gap-3">
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
                    className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.district ? "btn-primary btn-soft" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selectedVariables.district}
                      onChange={() => handleVariableChange("district")}
                    />
                    <span>District</span>
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
                    <span>Diagnosis date</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Date Filter and View Toggle */}
            <div className="flex flex-col gap-3">
              {enableViewToggle ? (
                <ViewSelect value={view} onValueChange={setView} />
              ) : null}
              <DiagnosisDateFilter
                currentStartDate={dateRangeStart}
                currentEndDate={dateRangeEnd}
                onDateRangeChange={handleDateRangeChange}
                loading={loading}
              />

              {/* Groups Input */}
              <div className="flex items-center gap-3">
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

                <span className="text-muted flex items-center gap-1.5 text-xs font-normal">
                  {loadingRecommendation ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      Calculating recommendation...
                    </>
                  ) : recommendedK ? (
                    <>Recommended: {recommendedK} groups</>
                  ) : (
                    <>Recommended: 2-25 groups</>
                  )}
                </span>
                {!loadingRecommendation && recommendationMessage ? (
                  <span className="text-warning text-xs font-medium">
                    {recommendationMessage}
                  </span>
                ) : null}
              </div>

              {/* Description */}
              <div className="text-muted text-xs font-normal">
                <span>
                  These groups are currently based on{" "}
                  <span className="font-medium">{appliedVariableSummary}</span>.
                  Patients with similar details in these areas are placed in the
                  same group
                </span>
                {hasPendingFilterChanges ? (
                  <span className="block mt-1">
                    The groups have not been updated. Click Apply to rebuild the
                    groups using the updated filters
                  </span>
                ) : null}
              </div>

              {/* Apply Button */}
              <div>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm w-fit"
                  title="Apply group settings"
                  disabled={loading}
                >
                  {loading ? "Applying..." : "Apply"}
                </button>
              </div>
            </div>
          </form>

          {/* Total Diagnoses Counter */}
          <div className="space-y-1 text-right">
            <div className="text-4xl font-semibold tracking-tight tabular-nums text-primary">
              {clusterData?.total_illnesses.toLocaleString() ?? "N/A"}
            </div>
            <div className="text-muted text-sm font-medium">Diagnoses</div>
          </div>
        </div>
      </div>

      {/* Cluster Selection Dropdown */}
      {showClusterSelector && !loading && clusterDisplayOptions.length > 0 ? (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-base-content/70">
            Select group:
          </span>
          <Select
            value={selectedClusterDisplay}
            onValueChange={(value) => setSelectedClusterDisplay(value)}
          >
            <SelectTrigger className="w-65 h-9">
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
        </div>
      ) : null}

      {/* Error Display */}
      {!loading && error ? (
        <div className="alert alert-error">
          <AlertCircle className="size-5" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Children render prop */}
      {children && children(renderProps)}

      {/* Confirm Modal */}
      {modalRoot ? createPortal(confirmModal, modalRoot) : null}
    </>
  );
};

export default ClusteringControlPanel;
