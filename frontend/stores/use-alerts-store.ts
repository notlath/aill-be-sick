import { create } from "zustand";
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

    // Initial fetch — load all alerts with their notes.
    // Supabase browser client can't join across tables, so fetch both separately
    // and merge.
    try {
      const [alertsResult, notesResult] = await Promise.all([
        supabase.from("Alert").select("*").order("createdAt", { ascending: false }),
        supabase
          .from("AlertNote")
          .select("id, alertId, authorId, content, createdAt, updatedAt"),
      ]);

      if (alertsResult.error) throw alertsResult.error;
      if (notesResult.error) throw notesResult.error;

      // We don't have authorName from Supabase without a join — fetch User names
      // for all unique authorIds encountered in notes.
      const rawNotes = (notesResult.data ?? []) as Omit<AlertNote, "authorName">[];
      const authorIds = [...new Set(rawNotes.map((n) => n.authorId))];

      let nameMap: Record<number, string | null> = {};
      if (authorIds.length > 0) {
        const usersResult = await supabase
          .from("User")
          .select("id, name")
          .in("id", authorIds);
        if (!usersResult.error) {
          for (const u of usersResult.data ?? []) {
            nameMap[u.id] = u.name ?? null;
          }
        }
      }

      const notes: AlertNote[] = rawNotes.map((n) => ({
        ...n,
        authorName: nameMap[n.authorId] ?? null,
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

      set({ alerts, isLoading: false });
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
          const incoming = { ...(payload.new as Alert), notes: [] };
          console.log("[useAlertsStore] Alert INSERT", incoming);
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
          console.log("[useAlertsStore] Alert UPDATE", updated);
          set((state) => {
            const exists = state.alerts.some((a) => a.id === updated.id);
            if (exists) {
              return {
                alerts: state.alerts.map((a) =>
                  a.id === updated.id
                    ? { ...updated, notes: a.notes ?? [] }
                    : a,
                ),
              };
            }
            // Prepend if the record wasn't in state yet (edge case).
            return { alerts: [{ ...updated, notes: [] }, ...state.alerts] };
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

  resolve: async (alertId: number) => {
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
      set((state) => ({
        alerts: state.alerts.map((a) =>
          a.id === note.alertId
            ? { ...a, notes: [...(a.notes ?? []), note] }
            : a,
        ),
      }));
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
      set((state) => ({
        alerts: state.alerts.map((a) => {
          if (a.id !== note.alertId) return a;
          return {
            ...a,
            notes: (a.notes ?? []).map((n) =>
              n.id === note.id
                ? { ...n, content: note.content, updatedAt: note.updatedAt }
                : n,
            ),
          };
        }),
      }));
    }
    return {};
  },
}));

export default useAlertsStore;
