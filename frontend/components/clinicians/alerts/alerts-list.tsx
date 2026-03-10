"use client";

import { useShallow } from "zustand/react/shallow";
import useAlertsStore from "@/stores/use-alerts-store";
import { columns } from "./columns";
import { AlertsTable } from "./alerts-table";

interface AlertsListProps {
  currentUserId: number | null;
}

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

  if (isLoading) {
    return <AlertsTableSkeleton />;
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>Failed to load alerts: {error}</span>
      </div>
    );
  }

  return (
    <AlertsTable
      columns={columns}
      data={alerts}
      currentUserId={currentUserId}
      onAcknowledge={acknowledge}
      onDismiss={dismiss}
      onResolve={resolve}
      onAddNote={addNote}
      onEditNote={editNote}
    />
  );
};

const AlertsTableSkeleton = () => (
  <div className="space-y-4">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="skeleton h-10 w-full sm:w-72 rounded-lg" />
      <div className="flex flex-wrap items-center gap-2">
        <div className="skeleton h-10 w-[200px] rounded-lg" />
        <div className="skeleton h-10 w-[180px] rounded-lg" />
        <div className="skeleton h-10 w-[180px] rounded-lg" />
      </div>
    </div>
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="h-12 border-b border-border bg-base-200/50" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-16 border-b border-border/50 px-6 py-4 flex items-center justify-between"
        >
          <div className="skeleton h-5 w-24" />
          <div className="skeleton h-5 w-24" />
          <div className="skeleton h-5 w-1/4" />
          <div className="skeleton h-8 w-24 rounded" />
        </div>
      ))}
    </div>
  </div>
);

export default AlertsList;
