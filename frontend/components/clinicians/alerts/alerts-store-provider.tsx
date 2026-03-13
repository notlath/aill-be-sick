"use client";

import { useEffect } from "react";
import useAlertsStore from "@/stores/use-alerts-store";

/**
 * Mounts silently in the clinician layout.
 * Calls initialize() once to open the single shared Supabase Realtime channel
 * and fetch existing alerts into the Zustand store. Tears down on unmount.
 * Renders nothing — all state is consumed directly from useAlertsStore.
 */
const AlertsStoreProvider = () => {
  const initialize = useAlertsStore((s) => s.initialize);
  const teardown = useAlertsStore((s) => s.teardown);

  useEffect(() => {
    initialize();
    return () => teardown();
  }, [initialize, teardown]);

  return null;
};

export default AlertsStoreProvider;
