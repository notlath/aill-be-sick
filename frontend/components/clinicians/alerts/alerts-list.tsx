"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/react/shallow";
import useAlertsStore from "@/stores/use-alerts-store";
import { AlertCard } from "./alert-card";
import { AlertDetailModal } from "./alert-detail-modal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Alert } from "@/types";

interface AlertsListProps {
  currentUserId: number | null;
}

const TABS = [
  { id: "NEW", label: "New Alerts" },
  { id: "ACKNOWLEDGED", label: "Acknowledged" },
  { id: "RESOLVED", label: "Resolved" },
  { id: "DISMISSED", label: "Dismissed" },
];

const AlertsList = ({ currentUserId }: AlertsListProps) => {
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
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const selectedAlert = useMemo(() => {
    if (selectedAlertId === null) return null;
    return alerts.find((a) => a.id === selectedAlertId) ?? null;
  }, [alerts, selectedAlertId]);

  const handleViewDetails = (alert: Alert) => {
    setSelectedAlertId(alert.id);
    setIsModalOpen(true);
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Filter by tab
      if (alert.status !== activeTab) return false;

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesMessage = alert.message.toLowerCase().includes(query);
        const matchesType = alert.type.toLowerCase().includes(query);
        const matchesSeverity = alert.severity.toLowerCase().includes(query);
        const matchesId = alert.diagnosisId?.toString() === query;
        return matchesMessage || matchesType || matchesSeverity || matchesId;
      }

      return true;
    });
  }, [alerts, activeTab, searchQuery]);

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

  // Calculate counts for tabs
  const tabCounts = TABS.reduce((acc, tab) => {
    acc[tab.id] = alerts.filter(a => a.status === tab.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
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
                {tab.id === "NEW" && tabCounts[tab.id] > 0 && activeTab !== tab.id && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/60 z-10 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search alerts by message, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content z-10 p-1"
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 relative min-h-[400px]">
        {filteredAlerts.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {filteredAlerts.map((alert) => (
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
              {searchQuery
                ? `No ${TABS.find(t => t.id === activeTab)?.label.toLowerCase()} match your search "${searchQuery}".`
                : `There are currently no ${TABS.find(t => t.id === activeTab)?.label.toLowerCase()}.`}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="btn btn-ghost btn-sm mt-4 normal-case text-primary hover:bg-primary/10"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>

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
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="skeleton h-12 w-full sm:w-[450px] rounded-2xl" />
      <div className="skeleton h-10 w-full sm:w-72 rounded-lg" />
    </div>
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton h-[116px] w-full rounded-[20px]" />
      ))}
    </div>
  </div>
);

export default AlertsList;
