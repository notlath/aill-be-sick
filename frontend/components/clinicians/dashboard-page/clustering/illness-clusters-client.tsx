"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import IllnessClusterOverviewCards from "./illness-cluster-overview-cards";
import type { IllnessClusterData } from "@/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

interface IllnessClustersClientProps {
  initialData?: IllnessClusterData;
  initialK?: number;
}

type ClusterVariableSelection = {
  age: boolean;
  gender: boolean;
  city: boolean;
  region: boolean;
  barangay: boolean;
  province: boolean;
  time: boolean;
};

type DiagnosisDateFilterMode = "all" | "month" | "week";

type MonthOption = {
  value: string;
  label: string;
  shortLabel: string;
  year: number;
};

type WeekOption = {
  value: string;
  label: string;
  year: number;
  week: number;
};

type WeekCalendarRow = {
  value: string;
  weekNumber: number;
  days: Date[];
};

const buildMonthOptions = (count: number) => {
  const options: Array<MonthOption> = [];
  const now = new Date();

  for (let offset = 0; offset < count; offset += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    options.push({
      value: `${year}-${month}`,
      label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      shortLabel: d.toLocaleDateString("en-US", { month: "short" }),
      year,
    });
  }

  return options;
};

const getISOWeekStart = (baseDate: Date) => {
  const d = new Date(baseDate);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getISOWeekInfo = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week };
};

const formatWeekDateRange = (start: Date, end: Date) => {
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${startLabel} - ${endLabel}`;
};

const buildWeekOptions = (count: number) => {
  const options: Array<WeekOption> = [];
  const currentWeekStart = getISOWeekStart(new Date());

  for (let offset = 0; offset < count; offset += 1) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - offset * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const { year, week } = getISOWeekInfo(weekStart);
    if (week < 1 || week > 53) {
      continue;
    }
    const weekStr = String(week).padStart(2, "0");
    const rangeLabel = formatWeekDateRange(weekStart, weekEnd);
    options.push({
      value: `${year}-W${weekStr}`,
      label: `${rangeLabel} (Week ${week})`,
      year,
      week,
    });
  }

  return options;
};

const getISOWeekValue = (weekStart: Date) => {
  const { year, week } = getISOWeekInfo(weekStart);
  return `${year}-W${String(week).padStart(2, "0")}`;
};

const getWeekStartFromISOValue = (weekValue: string) => {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekValue);
  if (!match) return null;

  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;

  const jan4 = new Date(year, 0, 4);
  const week1Start = getISOWeekStart(jan4);
  const start = new Date(week1Start);
  start.setDate(week1Start.getDate() + (week - 1) * 7);
  start.setHours(0, 0, 0, 0);
  return start;
};

const formatWeekPickerTriggerLabel = (weekValue: string) => {
  const weekStart = getWeekStartFromISOValue(weekValue);
  if (!weekStart) {
    return "Select week";
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const { week, year } = getISOWeekInfo(weekStart);

  const startLabel = weekStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = weekEnd.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `Week ${week} (${startLabel} - ${endLabel}, ${year})`;
};

const buildWeekCalendarRows = (monthDate: Date): WeekCalendarRow[] => {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const firstCalendarWeekStart = getISOWeekStart(monthStart);
  const lastCalendarWeekStart = getISOWeekStart(monthEnd);

  const rows: WeekCalendarRow[] = [];
  const cursor = new Date(firstCalendarWeekStart);

  while (cursor <= lastCalendarWeekStart) {
    const weekStart = new Date(cursor);
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + index);
      return day;
    });

    const { week } = getISOWeekInfo(weekStart);

    rows.push({
      value: getISOWeekValue(weekStart),
      weekNumber: week,
      days,
    });

    cursor.setDate(cursor.getDate() + 7);
  }

  return rows;
};

const DEFAULT_SELECTED_VARIABLES: ClusterVariableSelection = {
  age: true,
  gender: true,
  city: true,
  region: false,
  barangay: false,
  province: false,
  time: false,
};

const IllnessClustersClient: React.FC<IllnessClustersClientProps> = ({
  initialData,
  initialK = 4,
}) => {
  const [clusterData, setClusterData] = useState<IllnessClusterData | null>(
    initialData || null,
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [k, setK] = useState<number>(initialK);
  const [kInput, setKInput] = useState<string>(String(initialK));
  const [recommendedK, setRecommendedK] = useState<number | null>(null);
  const [loadingRecommendation, setLoadingRecommendation] =
    useState<boolean>(true);
  const [recommendationMessage, setRecommendationMessage] =
    useState<string>("");
  const [selectedVariables, setSelectedVariables] =
    useState<ClusterVariableSelection>(DEFAULT_SELECTED_VARIABLES);
  const [appliedVariables, setAppliedVariables] =
    useState<ClusterVariableSelection>(DEFAULT_SELECTED_VARIABLES);
  const [diagnosisDateFilterMode, setDiagnosisDateFilterMode] =
    useState<DiagnosisDateFilterMode>("all");
  const [diagnosisMonth, setDiagnosisMonth] = useState<string>("");
  const [diagnosisWeek, setDiagnosisWeek] = useState<string>("");
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [pendingK, setPendingK] = useState<number | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasFetchedInitialDataRef = useRef(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isWeekPickerOpen, setIsWeekPickerOpen] = useState(false);
  const [weekPickerMonth, setWeekPickerMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const weekPickerRef = useRef<HTMLDivElement | null>(null);
  const monthOptions = React.useMemo(() => buildMonthOptions(24), []);
  const weekOptions = React.useMemo(() => buildWeekOptions(52), []);
  const [activeMonthYear, setActiveMonthYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [activeWeekYear, setActiveWeekYear] = useState<number>(
    new Date().getFullYear(),
  );

  const availableMonthYears = React.useMemo(() => {
    const years = new Set<number>();
    monthOptions.forEach((option) => years.add(option.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [monthOptions]);

  const monthOptionsByYear = React.useMemo(() => {
    const grouped = new Map<number, MonthOption[]>();

    monthOptions.forEach((option) => {
      const current = grouped.get(option.year) ?? [];
      grouped.set(option.year, [...current, option]);
    });

    return grouped;
  }, [monthOptions]);

  const activeYearMonthOptions = React.useMemo(() => {
    const options = monthOptionsByYear.get(activeMonthYear) ?? [];

    return [...options].sort((a, b) => {
      const monthA = Number(a.value.split("-")[1]);
      const monthB = Number(b.value.split("-")[1]);
      return monthA - monthB;
    });
  }, [monthOptionsByYear, activeMonthYear]);

  const selectedMonthOption = React.useMemo(
    () => monthOptions.find((option) => option.value === diagnosisMonth),
    [diagnosisMonth, monthOptions],
  );

  const availableWeekYears = React.useMemo(() => {
    const years = new Set<number>();
    weekOptions.forEach((option) => years.add(option.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [weekOptions]);

  const weekOptionsByMonthInActiveYear = React.useMemo(() => {
    return weekOptions.filter((option) => option.year === activeWeekYear);
  }, [weekOptions, activeWeekYear]);

  const weekCalendarRows = React.useMemo(
    () => buildWeekCalendarRows(weekPickerMonth),
    [weekPickerMonth],
  );

  const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:10000";

  useEffect(() => {
    if (availableMonthYears.length === 0) {
      return;
    }

    if (!availableMonthYears.includes(activeMonthYear)) {
      setActiveMonthYear(availableMonthYears[0]);
    }
  }, [activeMonthYear, availableMonthYears]);

  useEffect(() => {
    if (availableWeekYears.length === 0) {
      return;
    }

    if (!availableWeekYears.includes(activeWeekYear)) {
      setActiveWeekYear(availableWeekYears[0]);
    }
  }, [activeWeekYear, availableWeekYears]);

  useEffect(() => {
    setWeekPickerMonth(
      new Date(activeWeekYear, weekPickerMonth.getMonth(), 1),
    );
  }, [activeWeekYear]);

  useEffect(() => {
    if (!diagnosisWeek) {
      return;
    }

    const selectedWeekStart = getWeekStartFromISOValue(diagnosisWeek);
    if (!selectedWeekStart) {
      return;
    }

    setActiveWeekYear(getISOWeekInfo(selectedWeekStart).year);
    setWeekPickerMonth(
      new Date(selectedWeekStart.getFullYear(), selectedWeekStart.getMonth(), 1),
    );
  }, [diagnosisWeek]);

  useEffect(() => {
    if (!isWeekPickerOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        weekPickerRef.current &&
        !weekPickerRef.current.contains(event.target as Node)
      ) {
        setIsWeekPickerOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsWeekPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isWeekPickerOpen]);

  const buildDiagnosisDateFilterParams = (): Record<string, string> => {
    if (diagnosisDateFilterMode === "month" && diagnosisMonth) {
      return { month: diagnosisMonth };
    }

    if (diagnosisDateFilterMode === "week" && diagnosisWeek) {
      return { week: diagnosisWeek };
    }

    return {};
  };

  const extractErrorMessage = async (response: Response) => {
    try {
      const payload = await response.json();
      if (payload && typeof payload.error === "string") {
        return payload.error;
      }
      if (payload && typeof payload.message === "string") {
        return payload.message;
      }
    } catch (_) {
      // Fall through to generic status message.
    }

    return `Request failed with status ${response.status}`;
  };

  // Fetch silhouette analysis to determine recommended k
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const fetchRecommendedK = async () => {
      try {
        setLoadingRecommendation(true);
        setRecommendationMessage("");
        const params = new URLSearchParams({
          range: "2-25",
          age: String(selectedVariables.age),
          gender: String(selectedVariables.gender),
          city: String(selectedVariables.city),
          region: String(selectedVariables.region),
          barangay: String(selectedVariables.barangay),
          province: String(selectedVariables.province),
          time: String(selectedVariables.time),
          ...buildDiagnosisDateFilterParams(),
        });
        const res = await fetch(
          `${BACKEND_URL}/api/illness-clusters/silhouette?${params.toString()}`,
        );
        if (!res.ok) {
          const apiError = await extractErrorMessage(res);
          throw new Error(apiError);
        }
        const data = await res.json();
        if (data.best && data.best.k) {
          setRecommendedK(data.best.k);
          setKInput(String(data.best.k));
          setRecommendationMessage("");
        } else {
          setRecommendedK(null);
          setRecommendationMessage(
            "Recommendation is unavailable for the current date filter.",
          );
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to fetch silhouette analysis";

        setRecommendedK(null);

        if (/Not enough samples/i.test(errorMessage)) {
          setRecommendationMessage(
            "Not enough diagnosis records in this date range to calculate a recommendation.",
          );
        } else {
          setRecommendationMessage(
            "Recommendation is temporarily unavailable. You can still choose groups manually.",
          );
          console.warn("Error fetching recommended k:", errorMessage);
        }
      } finally {
        setLoadingRecommendation(false);
      }
    };

    debounceTimerRef.current = setTimeout(fetchRecommendedK, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    selectedVariables,
    diagnosisDateFilterMode,
    diagnosisMonth,
    diagnosisWeek,
    BACKEND_URL,
  ]);

  // Keep the groups input aligned with the latest recommendation
  useEffect(() => {
    if (recommendedK) {
      setKInput(String(recommendedK));
    }
  }, [recommendedK]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const clampK = (val: number) => {
    if (Number.isNaN(val)) return k;
    if (val < 2) return 2;
    if (val > 25) return 25;
    return val;
  };

  const fetchClusterData = (
    clusterCount: number,
    variables: ClusterVariableSelection,
  ) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      n_clusters: String(clusterCount),
      age: String(variables.age),
      gender: String(variables.gender),
      city: String(variables.city),
      region: String(variables.region),
      barangay: String(variables.barangay),
      province: String(variables.province),
      time: String(variables.time),
      ...buildDiagnosisDateFilterParams(),
    });
    fetch(`${BACKEND_URL}/api/illness-clusters?${params.toString()}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch updated cluster data");
        }
        return res.json();
      })
      .then((data: IllnessClusterData) => {
        setClusterData(data);
      })
      .catch((err) => {
        setError(err.message || "An unknown error occurred");
        setClusterData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!initialData && !hasFetchedInitialDataRef.current) {
      hasFetchedInitialDataRef.current = true;
      fetchClusterData(k, appliedVariables);
    }
  }, [initialData, k, appliedVariables]);

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
    const nextVariables = { ...selectedVariables };

    setK(nextK);
    setKInput(String(nextK));
    setAppliedVariables(nextVariables);
    fetchClusterData(nextK, nextVariables);

    try {
      sessionStorage.setItem("illnessClusters.k", String(nextK));
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
    const selectedCount =
      Object.values(selectedVariables).filter(Boolean).length;

    if (selectedVariables[variable] && selectedCount === 1) {
      return;
    }

    // Update draft selections only; clusters regenerate when Apply is clicked
    setSelectedVariables((prev) => ({
      ...prev,
      [variable]: !prev[variable],
    }));
  };

  const handleLocationVariableChange = (
    variable: "city" | "region" | "barangay" | "province",
  ) => {
    setSelectedVariables((prev) => {
      // If selecting this location variable, deselect all other location variables
      if (!prev[variable]) {
        return {
          ...prev,
          city: variable === "city",
          region: variable === "region",
          barangay: variable === "barangay",
          province: variable === "province",
        };
      }

      // If deselecting, check if at least one variable would remain
      const wouldHaveOtherLocationVar =
        (variable !== "city" && prev.city) ||
        (variable !== "region" && prev.region) ||
        (variable !== "barangay" && prev.barangay) ||
        (variable !== "province" && prev.province);

      const wouldHaveNonLocationVar = prev.age || prev.gender || prev.time;

      if (!wouldHaveOtherLocationVar && !wouldHaveNonLocationVar) {
        return prev; // Don't deselect if it would leave no variables selected
      }

      return {
        ...prev,
        [variable]: false,
      };
    });
  };

  const handleDiagnosisDateFilterModeChange = (
    nextMode: DiagnosisDateFilterMode,
  ) => {
    setIsWeekPickerOpen(false);

    if (nextMode === "all") {
      setDiagnosisMonth("");
      setDiagnosisWeek("");
    } else if (nextMode === "month") {
      // Always default to the most recent month so filtering is explicit.
      setDiagnosisMonth((prev) => prev || monthOptions[0]?.value || "");
      setDiagnosisWeek("");
    } else if (nextMode === "week") {
      // Always default to the most recent week so filtering is explicit.
      setDiagnosisWeek((prev) => prev || weekOptions[0]?.value || "");
      setDiagnosisMonth("");
    }

    setDiagnosisDateFilterMode(nextMode);
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
            <div className="flex flex-wrap items-center gap-3">
              {/* Demographic Variables */}
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
                  <span>Patient age</span>
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
                  <span>Patient gender</span>
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
                  <span>Date of diagnosis (seasonal)</span>
                </label>
              </div>

              {/* Vertical Divider */}
              <div className="border-l border-base-300 h-8" />

              {/* Place Variables */}
              <div className="flex items-center gap-3">
                <label
                  className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.region ? "btn-primary btn-soft" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedVariables.region}
                    onChange={() => handleLocationVariableChange("region")}
                  />
                  <span>Region</span>
                </label>
                <label
                  className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.province ? "btn-primary btn-soft" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedVariables.province}
                    onChange={() => handleLocationVariableChange("province")}
                  />
                  <span>Province/District</span>
                </label>
                <label
                  className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.city ? "btn-primary btn-soft" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedVariables.city}
                    onChange={() => handleLocationVariableChange("city")}
                  />
                  <span>City</span>
                </label>
                <label
                  className={`btn btn-sm cursor-pointer font-normal ${selectedVariables.barangay ? "btn-primary btn-soft" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedVariables.barangay}
                    onChange={() => handleLocationVariableChange("barangay")}
                  />
                  <span>Barangay</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="text-xs font-medium">Diagnosis date filter:</span>

              <label
                className={`btn btn-sm cursor-pointer font-normal ${diagnosisDateFilterMode === "all" ? "btn-success btn-soft" : ""}`}
              >
                <input
                  type="radio"
                  name="diagnosis-date-filter"
                  className="hidden"
                  checked={diagnosisDateFilterMode === "all"}
                  onChange={() => {
                    handleDiagnosisDateFilterModeChange("all");
                  }}
                />
                <span>All dates</span>
              </label>

              <label
                className={`btn btn-sm cursor-pointer font-normal ${diagnosisDateFilterMode === "month" ? "btn-success btn-soft" : ""}`}
              >
                <input
                  type="radio"
                  name="diagnosis-date-filter"
                  className="hidden"
                  checked={diagnosisDateFilterMode === "month"}
                  onChange={() => {
                    handleDiagnosisDateFilterModeChange("month");
                  }}
                />
                <span>By month</span>
              </label>

              <label
                className={`btn btn-sm cursor-pointer font-normal ${diagnosisDateFilterMode === "week" ? "btn-success btn-soft" : ""}`}
              >
                <input
                  type="radio"
                  name="diagnosis-date-filter"
                  className="hidden"
                  checked={diagnosisDateFilterMode === "week"}
                  onChange={() => {
                    handleDiagnosisDateFilterModeChange("week");
                  }}
                />
                <span>By week</span>
              </label>

              {diagnosisDateFilterMode !== "all" ? (
                diagnosisDateFilterMode === "month" ? (
                  <Select
                    className="w-auto"
                    value={diagnosisMonth || monthOptions[0]?.value}
                    onValueChange={(value) => setDiagnosisMonth(value)}
                  >
                    <SelectTrigger
                      className="h-8 w-[260px] border-success/40 text-xs"
                      disabled={loading}
                    >
                      {selectedMonthOption
                        ? selectedMonthOption.label
                        : "Select month"}
                    </SelectTrigger>
                    <SelectContent className="left-0 w-[min(94vw,520px)] p-3">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs font-semibold uppercase text-base-content/70">
                            Year
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                          {availableMonthYears.map((year) => (
                            <button
                              key={year}
                              type="button"
                              className={`btn btn-sm ${activeMonthYear === year ? "btn-success" : "btn-ghost"}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setActiveMonthYear(year);
                              }}
                            >
                              {year}
                            </button>
                          ))}
                        </div>

                        <div className="border-base-300 border-t pt-3">
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {activeYearMonthOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                                className="list-none [&>a]:justify-center [&>a]:py-2.5"
                              >
                                {option.shortLabel} {option.year}
                              </SelectItem>
                            ))}
                          </div>
                        </div>
                      </div>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="relative w-auto" ref={weekPickerRef}>
                    <button
                      type="button"
                      className="flex h-8 w-[260px] items-center justify-between gap-2 rounded-[10px] border border-success/40 bg-white/50 px-4 py-2.5 text-xs text-base-content transition-all duration-200 hover:border-base-300/70 hover:bg-white/70 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      disabled={loading}
                      onClick={() => setIsWeekPickerOpen((prev) => !prev)}
                    >
                      <span className="truncate text-left">
                        {diagnosisWeek
                          ? formatWeekPickerTriggerLabel(diagnosisWeek)
                          : "Select week"}
                      </span>
                      <CalendarDays className="size-4 shrink-0" />
                    </button>

                    {isWeekPickerOpen ? (
                      <div className="bg-base-100 border-base-300 absolute left-0 z-40 mt-2 w-[min(94vw,520px)] rounded-[12px] border p-3 shadow-lg">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-semibold uppercase text-base-content/70">
                              Year
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                            {availableWeekYears.map((year) => (
                              <button
                                key={year}
                                type="button"
                                className={`btn btn-sm ${activeWeekYear === year ? "btn-success" : "btn-ghost"}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setActiveWeekYear(year);
                                }}
                              >
                                {year}
                              </button>
                            ))}
                          </div>

                          <div className="border-base-300 border-t pt-3">
                            <div className="mb-2 flex items-center justify-between">
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={() =>
                                  setWeekPickerMonth(
                                    (prev) =>
                                      new Date(
                                        prev.getFullYear(),
                                        prev.getMonth() - 1,
                                        1,
                                      ),
                                  )
                                }
                              >
                                <ChevronLeft className="size-4" />
                              </button>

                              <span className="text-sm font-semibold">
                                {weekPickerMonth.toLocaleDateString("en-US", {
                                  month: "long",
                                  year: "numeric",
                                })}
                              </span>

                              <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={() =>
                                  setWeekPickerMonth(
                                    (prev) =>
                                      new Date(
                                        prev.getFullYear(),
                                        prev.getMonth() + 1,
                                        1,
                                      ),
                                  )
                                }
                              >
                                <ChevronRight className="size-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-8 gap-1 px-1 text-center text-[11px] font-medium text-base-content/70">
                              <span>Wk</span>
                              <span>Mon</span>
                              <span>Tue</span>
                              <span>Wed</span>
                              <span>Thu</span>
                              <span>Fri</span>
                              <span>Sat</span>
                              <span>Sun</span>
                            </div>

                            <div className="mt-1 space-y-1">
                              {weekCalendarRows.map((row) => {
                                const isSelected = diagnosisWeek === row.value;
                                const existsInYear = weekOptionsByMonthInActiveYear.some(
                                  (option) => option.value === row.value,
                                );

                                return (
                                  <button
                                    key={row.value}
                                    type="button"
                                    disabled={!existsInYear}
                                    className={`grid w-full grid-cols-8 items-center gap-1 rounded-[10px] px-2 py-1.5 text-xs transition-colors ${
                                      isSelected
                                        ? "bg-success/20 ring-success/60 ring-1"
                                        : "hover:bg-success/15 hover:text-success"
                                    } ${!existsInYear ? "opacity-40" : ""}`}
                                    onClick={() => {
                                      setDiagnosisWeek(row.value);
                                      setIsWeekPickerOpen(false);
                                    }}
                                  >
                                    <span className="text-base-content/70 text-left text-[11px] font-semibold">
                                      {row.weekNumber}
                                    </span>

                                    {row.days.map((day) => {
                                      const inMonth =
                                        day.getMonth() === weekPickerMonth.getMonth() &&
                                        day.getFullYear() ===
                                          weekPickerMonth.getFullYear();

                                      return (
                                        <span
                                          key={day.toISOString()}
                                          className={`rounded-md px-1 py-0.5 text-center ${
                                            inMonth
                                              ? "text-base-content"
                                              : "text-base-content/40"
                                          }`}
                                        >
                                          {day.getDate()}
                                        </span>
                                      );
                                    })}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              ) : null}
            </div>

            {/* Groups */}
            <form onSubmit={onSubmitK} className="space-y-3">
              <div className="flex items-center gap-3">
                <label htmlFor="illness-cluster-k" className="text-xs">
                  Groups:
                </label>
                <Input
                  id="illness-cluster-k"
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
              {clusterData?.total_illnesses.toLocaleString() ?? "N/A"}
            </div>
            <div className="text-muted text-sm font-medium">Diagnoses</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex w-full flex-col gap-4">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="text-primary size-8 animate-spin" />
            <p className="text-muted-foreground text-sm font-medium">
              Recalculating clusters...
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <Card key={index} className="border-border h-[520px]">
                <CardHeader className="space-y-3">
                  <div className="skeleton h-6 w-20" />
                  <div className="skeleton h-20 w-full" />
                  <div className="skeleton h-3 w-32" />
                  <div className="skeleton h-3 w-24" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && (error || !clusterData) ? (
        <Card className="col-span-2 border-red-200/50 bg-red-50/50">
          <CardHeader className="py-20 text-center">
            <div className="mx-auto w-fit rounded-[12px] bg-red-100 p-3">
              <AlertCircle className="size-8 text-red-700" />
            </div>
            <CardTitle className="mt-4 text-red-700">
              Error Loading Cluster Data
            </CardTitle>
            <CardDescription className="text-red-600">
              {error || "Could not retrieve illness cluster information."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!loading && !error && clusterData ? (
        <div className="space-y-6">
          <IllnessClusterOverviewCards
            statistics={clusterData.cluster_statistics}
            selectedVariables={appliedVariables}
            illnesses={clusterData.illnesses}
          />
        </div>
      ) : null}

      {modalRoot ? createPortal(confirmModal, modalRoot) : null}
    </div>
  );
};

export default IllnessClustersClient;
