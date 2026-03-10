import { create } from "zustand";
import { createClient } from "@/utils/supabase/client";
import { acknowledgeAlert } from "@/actions/acknowledge-alert";
import { dismissAlert } from "@/actions/dismiss-alert";
import type { Alert } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface AlertsState {
  alerts: Alert[];
  /** The most recently received alert from the real-time channel (null until first INSERT). */
  latestAlert: Alert | null;
  isLoading: boolean;
  error: string | null;
  /** Prevents double-initialization if the provider mounts more than once. */
  isInitialized: boolean;

  /** Fetch existing alerts and open the single Supabase Realtime channel. */
  initialize: () => Promise<void>;
  /** Remove the Realtime channel and reset initialization state. */
  teardown: () => void;
  /** Clear latestAlert after a toast has been shown. */
  clearLatestAlert: () => void;
  /** Call the acknowledgeAlert server action. The Realtime UPDATE event propagates the change. */
  acknowledge: (alertId: number) => Promise<void>;
  /** Call the dismissAlert server action. The Realtime UPDATE event propagates the change. */
  dismiss: (alertId: number) => Promise<void>;
}

// Channel reference lives outside the store so it's not reactive state.
let _channel: RealtimeChannel | null = null;

const useAlertsStore = create<AlertsState>()((set, get) => ({
  alerts: [],
  latestAlert: null,
  isLoading: true,
  error: null,
  isInitialized: false,

  initialize: async () => {
    // Guard against double-initialization (e.g. React strict mode double-mount).
    if (get().isInitialized) return;
    set({ isInitialized: true });

    const supabase = createClient();

    // Initial fetch — load all alerts regardless of status so every consumer
    // can filter client-side without needing separate fetches.
    try {
      const { data, error: fetchError } = await supabase
        .from("Alert")
        .select("*")
        .order("createdAt", { ascending: false });

      if (fetchError) throw fetchError;
      set({ alerts: (data as Alert[]) ?? [], isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load alerts",
        isLoading: false,
      });
    }

    // Single Realtime channel shared by all consumers.
    _channel = supabase
      .channel("alerts-store")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Alert" },
        (payload) => {
          const incoming = payload.new as Alert;
          console.log("[useAlertsStore] INSERT", incoming);
          set((state) => ({
            alerts: [incoming, ...state.alerts],
            latestAlert: incoming,
          }));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "Alert" },
        (payload) => {
          const updated = payload.new as Alert;
          console.log("[useAlertsStore] UPDATE", updated);
          set((state) => {
            const exists = state.alerts.some((a) => a.id === updated.id);
            if (exists) {
              return {
                alerts: state.alerts.map((a) =>
                  a.id === updated.id ? updated : a,
                ),
              };
            }
            // Prepend if the record wasn't in state yet (edge case).
            return { alerts: [updated, ...state.alerts] };
          });
        },
      )
      .subscribe((status, err) => {
        if (err) console.error("[useAlertsStore] channel error:", err);
        else console.log("[useAlertsStore] channel status:", status);
      });
  },

  teardown: () => {
    if (_channel) {
      const supabase = createClient();
      supabase.removeChannel(_channel);
      _channel = null;
    }
    set({ isInitialized: false });
  },

  clearLatestAlert: () => set({ latestAlert: null }),

  acknowledge: async (alertId: number) => {
    const result = await acknowledgeAlert({ alertId });
    if (result?.data?.error) {
      console.error("[useAlertsStore] acknowledge failed:", result.data.error);
    }
    // No optimistic update needed — the Realtime UPDATE event syncs state
    // automatically for all connected clinicians.
  },

  dismiss: async (alertId: number) => {
    const result = await dismissAlert({ alertId });
    if (result?.data?.error) {
      console.error("[useAlertsStore] dismiss failed:", result.data.error);
    }
  },
}));

export default useAlertsStore;
