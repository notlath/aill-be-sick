"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/react/shallow";
import useAlertsStore from "@/stores/use-alerts-store";
import { AlertCard } from "./alert-card";
import { AlertDetailModal } from "./alert-detail-modal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, X, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";
import { parseUtcDate } from "@/utils/lib";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { Alert, AlertSeverity, AlertType } from "@/types";
import { ExportReportButton } from "@/components/ui/export-report-button";

interface AlertsListProps {
  currentUserId: number | null;
  generatedBy?: { name: string; email?: string };
}

const TABS = [
  { id: "NEW", label: "New Alerts" },
  { id: "ACKNOWLEDGED", label: "Acknowledged" },
  { id: "RESOLVED", label: "Resolved" },
  { id: "DISMISSED", label: "Dismissed" },
];

type SortOption = {
  value: string;
  label: string;
  compareFn: (a: Alert, b: Alert) => number;
};

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const TYPE_LABELS: Record<AlertType, string> = {
  ANOMALY: "Anomaly",
  OUTBREAK: "Outbreak",
};

const SORT_OPTIONS: SortOption[] = [
  {
    value: "newest",
    label: "Newest first",
    compareFn: (a, b) => parseUtcDate(b.createdAt).getTime() - parseUtcDate(a.createdAt).getTime(),
  },
  {
    value: "oldest",
    label: "Oldest first",
    compareFn: (a, b) => parseUtcDate(a.createdAt).getTime() - parseUtcDate(b.createdAt).getTime(),
  },
  {
    value: "severity-high",
    label: "Severity (High → Low)",
    compareFn: (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  },
  {
    value: "severity-low",
    label: "Severity (Low → High)",
    compareFn: (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity],
  },
];

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All severities" },
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "ANOMALY", label: "Anomaly" },
  { value: "OUTBREAK", label: "Outbreak" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const AlertsList = ({ currentUserId, generatedBy }: AlertsListProps) => {
  const { alerts, isLoading, error, acknowledge, dismiss, resolve, addNote, editNote } =
    useAlertsStore(
      useShallow((s) => ({
        alerts: s.alerts,
        isLoading: s.isLoading,
        error: s.error,
        acknowledge: s.acknowledge,
        dismiss: s.dismiss,
        resolve: s.resolve,
        addNote: s.addNote,
        editNote: s.editNote,
      })),
    );

  const [activeTab, setActiveTab] = useState("NEW");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortValue, setSortValue] = useState("newest");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [reasonCodeFilter, setReasonCodeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset to page 0 whenever any filter/sort/tab changes
  useEffect(() => {
    setCurrentPage(0);
  }, [activeTab, searchQuery, sortValue, severityFilter, typeFilter, reasonCodeFilter, pageSize]);

  const selectedAlert = useMemo(() => {
    if (selectedAlertId === null) return null;
    return alerts.find((a) => a.id === selectedAlertId) ?? null;
  }, [alerts, selectedAlertId]);

  const handleViewDetails = (alert: Alert) => {
    setSelectedAlertId(alert.id);
    setIsModalOpen(true);
  };

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setSeverityFilter("all");
    setTypeFilter("all");
    setReasonCodeFilter("all");
    setSearchQuery("");
  }, []);

  const currentSortOption = useMemo(
    () => SORT_OPTIONS.find((o) => o.value === sortValue) ?? SORT_OPTIONS[0],
    [sortValue],
  );

  // All filtering + sorting (full result set, used for export + pagination math)
  const filteredAndSortedAlerts = useMemo(() => {
    const query = searchQuery.toLowerCase();

    return alerts
      .filter((alert) => {
        if (alert.status !== activeTab) return false;
        if (severityFilter !== "all" && alert.severity !== severityFilter) return false;
        if (typeFilter !== "all" && alert.type !== typeFilter) return false;
        if (reasonCodeFilter !== "all" && !alert.reasonCodes?.includes(reasonCodeFilter)) return false;
        if (query) {
          const matchesMessage = alert.message.toLowerCase().includes(query);
          const matchesType = alert.type.toLowerCase().includes(query);
          const matchesSeverity = alert.severity.toLowerCase().includes(query);
          const matchesId = alert.diagnosisId?.toString() === query;
          if (!matchesMessage && !matchesType && !matchesSeverity && !matchesId) return false;
        }
        return true;
      })
      .sort(currentSortOption.compareFn);
  }, [alerts, activeTab, searchQuery, severityFilter, typeFilter, reasonCodeFilter, currentSortOption]);

  // Paginated slice
  const paginatedAlerts = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredAndSortedAlerts.slice(start, start + pageSize);
  }, [filteredAndSortedAlerts, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedAlerts.length / pageSize));
  const rangeStart = filteredAndSortedAlerts.length === 0 ? 0 : currentPage * pageSize + 1;
  const rangeEnd = Math.min((currentPage + 1) * pageSize, filteredAndSortedAlerts.length);

  const alertsExportColumns = useMemo(
    () => [
      { header: "ID", dataKey: "id" },
      { header: "Type", dataKey: "type" },
      { header: "Severity", dataKey: "severity" },
      { header: "Message", dataKey: "message" },
      { header: "Status", dataKey: "status" },
      { header: "Created", dataKey: "createdAt" },
    ],
    []
  );

  const alertsExportData = useMemo(
    () =>
      filteredAndSortedAlerts.map((alert) => ({
        id: alert.id,
        type: TYPE_LABELS[alert.type] ?? alert.type,
        severity: alert.severity,
        message: alert.message,
        status: alert.status,
        createdAt: parseUtcDate(alert.createdAt),
      })),
    [filteredAndSortedAlerts]
  );

  // Calculate counts for tabs
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tab of TABS) {
      counts[tab.id] = 0;
    }
    for (const alert of alerts) {
      if (counts[alert.status] !== undefined) {
        counts[alert.status]++;
      }
    }
    return counts;
  }, [alerts]);

  // Extract unique reason codes from all alerts
  const uniqueReasonCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const alert of alerts) {
      if (alert.reasonCodes) {
        for (const code of alert.reasonCodes) {
          codes.add(code);
        }
      }
    }
    return Array.from(codes).sort();
  }, [alerts]);

  const reasonCodeOptions = useMemo(() => {
    return [
      { value: "all", label: "All reason codes" },
      ...uniqueReasonCodes.map((code) => ({
        value: code,
        label: code,
      })),
    ];
  }, [uniqueReasonCodes]);

  // Map for O(1) tab label lookups
  const tabLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const tab of TABS) {
      map[tab.id] = tab.label;
    }
    return map;
  }, []);

  const hasActiveFilters = severityFilter !== "all" || typeFilter !== "all" || reasonCodeFilter !== "all" || !!searchQuery;

  const handleClearFilters = () => {
    setSeverityFilter("all");
    setTypeFilter("all");
    setReasonCodeFilter("all");
    setSearchQuery("");
  };

  if (isLoading) {
    return <AlertsListSkeleton />;
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>Failed to load alerts: {error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs row */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full overflow-x-auto pb-1 hide-scrollbar">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-2 relative">
              {tab.label}
              <span className={`inline-flex items-center justify-center px-1.5 min-w-5 h-5 rounded-full text-xs font-semibold ${activeTab === tab.id
                ? "bg-base-content/10 text-base-content"
                : "bg-base-200/50 text-base-content/50"
                }`}>
                {tabCounts[tab.id] || 0}
              </span>
              {tab.id === "NEW" && tabCounts[tab.id] > 0 && activeTab !== tab.id ? (
                <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Controls row: sort, filters, search, export */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Sort */}
        <Select value={sortValue} onValueChange={setSortValue} className="w-48 shrink-0">
          <SelectTrigger className="h-10 text-sm">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Severity filter */}
        <Select value={severityFilter} onValueChange={setSeverityFilter} className="w-44 shrink-0">
          <SelectTrigger className="h-10 text-sm">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            {SEVERITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter} className="w-44 shrink-0">
          <SelectTrigger className="h-10 text-sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Reason code filter */}
        {uniqueReasonCodes.length > 0 && (
          <Select value={reasonCodeFilter} onValueChange={setReasonCodeFilter} className="w-48 shrink-0">
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="Reason code" />
            </SelectTrigger>
            <SelectContent>
              {reasonCodeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Search */}
        <div className="relative flex-1 min-w-48 shrink-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/60 z-10 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search alerts by message, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 w-full"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content z-10 p-1"
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>

        {/* Export Report — pushed to the right end */}
        {filteredAndSortedAlerts.length > 0 && (
          <div className="ml-auto shrink-0">
            <ExportReportButton
              data={alertsExportData}
              columns={alertsExportColumns}
              filenameSlug={`alerts-${activeTab.toLowerCase()}`}
              title="Alerts Report"
              subtitle={tabLabelMap[activeTab] || "All Alerts"}
              generatedBy={generatedBy}
            />
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-3 relative min-h-[400px] mt-2">
        {paginatedAlerts.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {paginatedAlerts.map((alert) => (
              <div key={alert.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <AlertCard
                  alert={alert}
                  onViewDetails={handleViewDetails}
                  onAcknowledge={acknowledge}
                  onDismiss={dismiss}
                  onResolve={resolve}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-base-100/50 border border-border border-dashed rounded-xl">
            <div className="bg-base-200/50 p-4 rounded-full mb-4">
              <Search className="w-8 h-8 text-base-content/30" />
            </div>
            <h3 className="text-lg font-medium text-base-content mb-1">No alerts found</h3>
            <p className="text-sm text-base-content/60 max-w-sm">
              {hasActiveFilters
                ? `No ${tabLabelMap[activeTab]?.toLowerCase()} match your current filters.`
                : `There are currently no ${tabLabelMap[activeTab]?.toLowerCase()}.`}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={handleClearFilters}
                className="btn btn-ghost btn-sm mt-4 normal-case text-primary hover:bg-primary/10"
              >
                Clear Filters
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Pagination bar */}
      {filteredAndSortedAlerts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {/* Rows per page */}
          <div className="flex items-center gap-2 text-sm text-base-content/60">
            <span className="shrink-0">Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => setPageSize(Number(v))}
              className="w-24"
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Range label + navigation */}
          <div className="flex items-center gap-3 text-sm text-base-content/60">
            <span className="shrink-0">
              {rangeStart}–{rangeEnd} of {filteredAndSortedAlerts.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(0)}
                disabled={currentPage === 0}
                className="btn btn-ghost btn-xs btn-square disabled:opacity-30"
                aria-label="First page"
              >
                <ChevronFirst className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="btn btn-ghost btn-xs btn-square disabled:opacity-30"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="btn btn-ghost btn-xs btn-square disabled:opacity-30"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages - 1)}
                disabled={currentPage >= totalPages - 1}
                className="btn btn-ghost btn-xs btn-square disabled:opacity-30"
                aria-label="Last page"
              >
                <ChevronLast className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {isMounted && selectedAlert ? createPortal(
        <AlertDetailModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            // Don't immediately clear selected id to allow closing animation
            setTimeout(() => setSelectedAlertId(null), 300);
          }}
          alert={selectedAlert}
          currentUserId={currentUserId}
          onAcknowledge={acknowledge}
          onDismiss={dismiss}
          onResolve={resolve}
          onAddNote={addNote}
          onEditNote={editNote}
        />,
        document.body
      ) : null}
    </div>
  );
};

const AlertsListSkeleton = () => (
  <div className="space-y-4">
    {/* Tabs row */}
    <div className="skeleton h-12 w-full sm:w-[450px] rounded-2xl" />
    {/* Controls row */}
    <div className="flex flex-wrap gap-2">
      <div className="skeleton h-10 w-48 rounded-lg" />
      <div className="skeleton h-10 w-44 rounded-lg" />
      <div className="skeleton h-10 w-44 rounded-lg" />
      <div className="skeleton h-10 flex-1 min-w-48 rounded-lg" />
      <div className="skeleton h-10 w-32 rounded-lg ml-auto" />
    </div>
    {/* Cards */}
    <div className="space-y-3 mt-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton h-[116px] w-full rounded-[20px]" />
      ))}
    </div>
    {/* Pagination bar */}
    <div className="flex items-center justify-between pt-2">
      <div className="skeleton h-8 w-36 rounded-lg" />
      <div className="skeleton h-8 w-48 rounded-lg" />
    </div>
  </div>
);

export default AlertsList;
