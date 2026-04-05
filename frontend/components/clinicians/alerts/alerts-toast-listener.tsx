"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import useAlertsStore from "@/stores/use-alerts-store";
import { parseUtcDate } from "@/utils/lib";

/**
 * Mounts silently in the clinician layout.
 * Shows a single sonner toast whenever a cron run completes, summarizing
 * all alerts detected in that run (exactly 1 toast per 15-minute cycle).
 */
const AlertsToastListener = () => {
  const { latestCronRun, clearLatestCronRun } = useAlertsStore(
    useShallow((s) => ({
      latestCronRun: s.latestCronRun,
      clearLatestCronRun: s.clearLatestCronRun,
    })),
  );

  useEffect(() => {
    if (!latestCronRun) return;

    const { anomalyCount, outbreakCount, timestamp } = latestCronRun;
    const totalAlerts = anomalyCount + outbreakCount;

    // Skip toast if nothing was detected this run
    if (totalAlerts === 0) {
      clearLatestCronRun();
      return;
    }

    // Build summary parts
    const parts: string[] = [];
    if (anomalyCount > 0) {
      parts.push(`${anomalyCount} anomal${anomalyCount === 1 ? "y" : "ies"}`);
    }
    if (outbreakCount > 0) {
      parts.push(`${outbreakCount} outbreak${outbreakCount === 1 ? "" : "s"}`);
    }
    const summary = parts.join(", ");

    // Severity colour: use highest priority detected
    const toastFn =
      anomalyCount > 0 || outbreakCount > 2
        ? toast.error
        : outbreakCount > 0
          ? toast.warning
          : toast.info;

    toastFn(`${totalAlerts} new alert${totalAlerts === 1 ? "" : "s"} detected`, {
      description: `${summary} · ${parseUtcDate(timestamp).toLocaleTimeString()}`,
      duration: 8000,
      action: {
        label: "View Alerts",
        onClick: () => {
          window.location.href = "/alerts";
        },
      },
    });

    clearLatestCronRun();
  }, [latestCronRun, clearLatestCronRun]);

  return null;
};

export default AlertsToastListener;
