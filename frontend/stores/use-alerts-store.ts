import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createClient } from "@/utils/supabase/client";
import { acknowledgeAlert } from "@/actions/acknowledge-alert";
import { dismissAlert } from "@/actions/dismiss-alert";
import { resolveAlert } from "@/actions/resolve-alert";
import { createAlertNote } from "@/actions/create-alert-note";
import { updateAlertNote } from "@/actions/update-alert-note";
import type { Alert, AlertNote } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface AlertsState {
  alerts: Alert[];
  /** The most recently received alert from the real-time channel (null until first INSERT). */
  latestAlert: Alert | null;
  isLoading: boolean;
  error: string | null;
  /** Prevents double-initialization if the provider mounts more than once. */
  isInitialized: boolean;

  /** Fetch existing alerts (with notes) and open the single Supabase Realtime channel. */
  initialize: () => Promise<void>;
  /** Remove the Realtime channel and reset initialization state. */
  teardown: () => void;
  /** Clear latestAlert after a toast has been shown. */
  clearLatestAlert: () => void;
  /** Call the acknowledgeAlert server action. The Realtime UPDATE event propagates the change. */
  acknowledge: (alertId: number) => Promise<void>;
  /** Call the dismissAlert server action. The Realtime UPDATE event propagates the change. */
  dismiss: (alertId: number) => Promise<void>;
  /** Call the resolveAlert server action. The Realtime UPDATE event propagates the change. */
  resolve: (alertId: number) => Promise<void>;
  /** Add a note to an alert via server action and update local state. */
  addNote: (alertId: number, content: string) => Promise<{ error?: string }>;
  /** Edit an existing note via server action and update local state. */
  editNote: (noteId: number, content: string) => Promise<{ error?: string }>;
}

// Channel reference lives outside the store so it's not reactive state.
let _channel: RealtimeChannel | null = null;

const useAlertsStore = create<AlertsState>()(
  immer((set, get) => ({
    alerts: [],
    latestAlert: null,
    isLoading: true,
    error: null,
    isInitialized: false,

  initialize: async () => {
    // Guard against double-initialization (e.g. React strict mode double-mount).
    if (get().isInitialized) return;
    set((state) => {
      state.isInitialized = true;
    });

    const supabase = createClient();

    // Initial fetch — load all alerts with their notes.
    // Fetch AlertNote with the author relationship to get authorName in a single query.
    try {
      const [alertsResult, notesResult] = await Promise.all([
        supabase.from("Alert").select("*").order("createdAt", { ascending: false }),
        supabase
          .from("AlertNote")
          .select("id, alertId, authorId, author:User(name), content, createdAt, updatedAt"),
      ]);

      if (alertsResult.error) throw alertsResult.error;
      if (notesResult.error) throw notesResult.error;

      const notes: AlertNote[] = (notesResult.data ?? []).map((n: any) => ({
        id: n.id,
        alertId: n.alertId,
        authorId: n.authorId,
        authorName: n.author?.name ?? null,
        content: n.content,
        createdAt:
          typeof n.createdAt === "string"
            ? n.createdAt
            : new Date(n.createdAt).toISOString(),
        updatedAt:
          typeof n.updatedAt === "string"
            ? n.updatedAt
            : new Date(n.updatedAt).toISOString(),
      }));

      // Group notes by alertId for fast lookup.
      const notesByAlert: Record<number, AlertNote[]> = {};
      for (const note of notes) {
        if (!notesByAlert[note.alertId]) notesByAlert[note.alertId] = [];
        notesByAlert[note.alertId].push(note);
      }

      const alerts: Alert[] = (alertsResult.data ?? []).map((a: any) => ({
        ...a,
        notes: notesByAlert[a.id] ?? [],
      }));

      set((state) => {
        state.alerts = alerts;
        state.isLoading = false;
      });
    } catch (err) {
      set((state) => {
        state.error = err instanceof Error ? err.message : "Failed to load alerts";
        state.isLoading = false;
      });
    }

    // Single Realtime channel shared by all consumers.
    _channel = supabase
      .channel("alerts-store")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Alert" },
        (payload) => {
          const incoming = { ...(payload.new as Alert), notes: [] };
          console.log("[useAlertsStore] Alert INSERT", incoming);
          set((state) => {
            state.alerts.unshift(incoming);
            state.latestAlert = incoming;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "Alert" },
        (payload) => {
          const updated = payload.new as Alert;
          console.log("[useAlertsStore] Alert UPDATE", updated);
          set((state) => {
            const alertIndex = state.alerts.findIndex((a) => a.id === updated.id);
            if (alertIndex !== -1) {
              const existingNotes = state.alerts[alertIndex].notes ?? [];
              state.alerts[alertIndex] = { ...updated, notes: existingNotes };
            } else {
              // Prepend if the record wasn't in state yet (edge case).
              state.alerts.unshift({ ...updated, notes: [] });
            }
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
    set((state) => {
      state.isInitialized = false;
    });
  },

  clearLatestAlert: () => set((state) => {
    state.latestAlert = null;
  }),

  acknowledge: async (alertId: number) => {
    set((state) => {
      const alert = state.alerts.find((a) => a.id === alertId);
      if (alert) {
        alert.status = "ACKNOWLEDGED";
        alert.acknowledgedAt = new Date().toISOString();
      }
    });
    const result = await acknowledgeAlert({ alertId });
    if (result?.data?.error) {
      console.error("[useAlertsStore] acknowledge failed:", result.data.error);
    }
  },

  dismiss: async (alertId: number) => {
    set((state) => {
      const alert = state.alerts.find((a) => a.id === alertId);
      if (alert) {
        alert.status = "DISMISSED";
      }
    });
    const result = await dismissAlert({ alertId });
    if (result?.data?.error) {
      console.error("[useAlertsStore] dismiss failed:", result.data.error);
    }
  },

  resolve: async (alertId: number) => {
    set((state) => {
      const alert = state.alerts.find((a) => a.id === alertId);
      if (alert) {
        alert.status = "RESOLVED";
        alert.resolvedAt = new Date().toISOString();
      }
    });
    const result = await resolveAlert({ alertId });
    if (result?.data?.error) {
      console.error("[useAlertsStore] resolve failed:", result.data.error);
    }
  },

  addNote: async (alertId: number, content: string) => {
    const result = await createAlertNote({ alertId, content });
    if (result?.data?.error) {
      console.error("[useAlertsStore] addNote failed:", result.data.error);
      return { error: result.data.error };
    }
    // Immediately apply the returned note to local state so the UI updates
    // without waiting for the Realtime INSERT round-trip.
    const note = result?.data?.success;
    if (note) {
      set((state) => {
        const alert = state.alerts.find((a) => a.id === note.alertId);
        if (alert) {
          if (!alert.notes) alert.notes = [];
          alert.notes.push(note);
        }
      });
    }
    return {};
  },

  editNote: async (noteId: number, content: string) => {
    const result = await updateAlertNote({ noteId, content });
    if (result?.data?.error) {
      console.error("[useAlertsStore] editNote failed:", result.data.error);
      return { error: result.data.error };
    }
    // Immediately apply the updated note to local state so the UI updates
    // without waiting for the Realtime UPDATE round-trip.
    const note = result?.data?.success;
    if (note) {
      set((state) => {
        const alert = state.alerts.find((a) => a.id === note.alertId);
        if (alert) {
          const noteToUpdate = alert.notes?.find((n) => n.id === note.id);
          if (noteToUpdate) {
            noteToUpdate.content = note.content;
            noteToUpdate.updatedAt = note.updatedAt;
          }
        }
      });
    }
    return {};
  },
  })),
);

// ✅ GOOD: Computed/derived state via selector
export const useUnreadAlertsCount = () =>
  useAlertsStore((state) => state.alerts.filter((a) => a.status === "NEW").length);

export default useAlertsStore;
