"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import useAlertsStore from "@/stores/use-alerts-store";
import { getSeverityLabel } from "@/utils/alert-severity";

/**
 * Mounts silently in the clinician layout.
 * Shows a sonner toast whenever a new alert arrives via Supabase Realtime.
 */
const AlertsToastListener = () => {
  const { latestAlert, clearLatestAlert } = useAlertsStore(
    useShallow((s) => ({
      latestAlert: s.latestAlert,
      clearLatestAlert: s.clearLatestAlert,
    })),
  );

  useEffect(() => {
    if (!latestAlert) return;

    const severityLabel = getSeverityLabel(latestAlert.severity);

    const toastFn =
      latestAlert.severity === "CRITICAL" || latestAlert.severity === "HIGH"
        ? toast.error
        : latestAlert.severity === "MEDIUM"
        ? toast.warning
        : toast.info;

    toastFn(`${severityLabel} alert: ${latestAlert.message}`, {
      description: `Diagnosis #${latestAlert.diagnosisId ?? "—"} · ${new Date(latestAlert.createdAt).toLocaleTimeString()}`,
      duration: 8000,
      action: {
        label: "View Alerts",
        onClick: () => {
          window.location.href = "/alerts";
        },
      },
    });

    clearLatestAlert();
  }, [latestAlert, clearLatestAlert]);

  return null;
};

export default AlertsToastListener;
