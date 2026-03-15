"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import type { Alert, AlertNote } from "@/types";
import { getReasonLabel, getReasonDescription } from "@/utils/anomaly-reasons";
import { getSeverityBadgeClass, getSeverityLabel } from "@/utils/alert-severity";
import { getDistrictCentroid } from "@/constants/bagong-silangan-districts";

const statusLabel: Record<Alert["status"], string> = {
  NEW: "New",
  ACKNOWLEDGED: "Acknowledged",
  DISMISSED: "Dismissed",
  RESOLVED: "Resolved",
};

const statusBadgeClass: Record<Alert["status"], string> = {
  NEW: "badge-error",
  ACKNOWLEDGED: "badge-success",
  DISMISSED: "badge-ghost",
  RESOLVED: "badge-info",
};

interface AlertDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: Alert | null;
  currentUserId: number | null;
  onAcknowledge: (id: number) => Promise<void>;
  onDismiss: (id: number) => Promise<void>;
  onResolve: (id: number) => Promise<void>;
  onAddNote: (alertId: number, content: string) => Promise<{ error?: string }>;
  onEditNote: (noteId: number, content: string) => Promise<{ error?: string }>;
}

export function AlertDetailModal({
  isOpen,
  onClose,
  alert,
  currentUserId,
  onAcknowledge,
  onDismiss,
  onResolve,
  onAddNote,
  onEditNote,
}: AlertDetailModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Notes state
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Inline edit state
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Action loading states
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  // Reset note form when the modal is closed or a different alert is opened.
  useEffect(() => {
    if (!isOpen) {
      setNewNoteContent("");
      setNoteError(null);
      setEditingNoteId(null);
      setEditingContent("");
      setIsAcknowledging(false);
      setIsDismissing(false);
      setIsResolving(false);
    }
  }, [isOpen]);

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleClose = () => onClose();

  const handleAcknowledge = async () => {
    if (!alert) return;
    setIsAcknowledging(true);
    try {
      await onAcknowledge(alert.id);
    } finally {
      setIsAcknowledging(false);
      handleClose();
    }
  };

  const handleDismiss = async () => {
    if (!alert) return;
    setIsDismissing(true);
    try {
      await onDismiss(alert.id);
    } finally {
      setIsDismissing(false);
      handleClose();
    }
  };

  const handleResolve = async () => {
    if (!alert) return;
    setIsResolving(true);
    try {
      await onResolve(alert.id);
    } finally {
      setIsResolving(false);
      handleClose();
    }
  };

  const handleViewOnMap = () => {
    if (!alert) return;
    const meta = alert.metadata as any;
    if (!meta) return;
    const params = new URLSearchParams();
    
    if (alert.type === "OUTBREAK") {
      params.set("tab", "by-disease");
      if (meta.disease) params.set("disease", meta.disease);
      if (meta.district) {
        const centroid = getDistrictCentroid(meta.district);
        if (centroid) {
          params.set("lat", String(centroid.lat));
          params.set("lng", String(centroid.lng));
        }
      }
    } else {
      params.set("tab", "by-anomaly");
      if (meta.disease) params.set("disease", meta.disease);
      if (meta.latitude) params.set("lat", String(meta.latitude));
      if (meta.longitude) params.set("lng", String(meta.longitude));
    }
    
    onClose();
    router.push(`/map?${params.toString()}`);
  };

  const handleAddNote = async () => {
    if (!alert || !newNoteContent.trim()) return;
    setIsSubmittingNote(true);
    setNoteError(null);
    const result = await onAddNote(alert.id, newNoteContent.trim());
    setIsSubmittingNote(false);
    if (result.error) {
      setNoteError(result.error);
    } else {
      setNewNoteContent("");
    }
  };

  const handleStartEdit = (note: AlertNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingContent("");
  };

  const handleSaveEdit = async () => {
    if (editingNoteId === null || !editingContent.trim()) return;
    setIsSavingEdit(true);
    const result = await onEditNote(editingNoteId, editingContent.trim());
    setIsSavingEdit(false);
    if (!result.error) {
      setEditingNoteId(null);
      setEditingContent("");
    }
  };

  if (!isOpen || !alert) return null;

  const notes: AlertNote[] = alert.notes ?? [];
  const isPending = alert.status === "NEW";
  const isAcknowledged = alert.status === "ACKNOWLEDGED";

  return (
    <dialog
      ref={dialogRef}
      className="modal [&::backdrop]:bg-black"
      onCancel={onClose}
      onClick={onClose}
    >
      <div
        className="modal-box w-11/12 max-w-2xl bg-base-100 max-h-[90vh] overflow-y-auto"
        onClick={handleContentClick}
      >
        <button 
          type="button"
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
        >
          ✕
        </button>
        <h3 className="font-bold text-2xl mb-6">Alert Details</h3>

        <div className="space-y-4">
          {/* Priority — Severity + Status badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${getSeverityBadgeClass(alert.severity)}`}>
              {getSeverityLabel(alert.severity)}
            </span>
            <span className={`badge ${statusBadgeClass[alert.status]}`}>
              {statusLabel[alert.status]}
            </span>
          </div>

          {/* What happened — message */}
          <div className="bg-base-200/50 p-4 rounded-lg">
            <p className="text-xs text-base-content/50 uppercase tracking-wide mb-1">What happened</p>
            <p className="text-sm leading-relaxed">{alert.message}</p>
          </div>

          {/* Disease & Location */}
          {alert.metadata && ((alert.metadata as any).disease || (alert.metadata as any).district || (alert.metadata as any).city) ? (
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-xs text-base-content/50 uppercase tracking-wide mb-2">Disease &amp; Location</p>
              <div className="space-y-1 text-sm">
                {(alert.metadata as any).disease ? (
                  <p className="font-semibold text-base">{(alert.metadata as any).disease}</p>
                ) : null}
                <p className="text-base-content/70">
                  {[(alert.metadata as any).district, (alert.metadata as any).barangay, (alert.metadata as any).city, (alert.metadata as any).province]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            </div>
          ) : null}

          {/* Why this alert — reason codes */}
          {alert.reasonCodes.length > 0 ? (
            <div className="bg-base-200/50 p-4 rounded-lg space-y-3">
              <p className="text-xs text-base-content/50 uppercase tracking-wide">Why this alert</p>
              {alert.reasonCodes.map((code) => (
                <div key={code}>
                  <p className="text-sm font-medium">{getReasonLabel(code)}</p>
                  <p className="text-xs text-base-content/60 mt-0.5">
                    {getReasonDescription(code)}
                  </p>
                </div>
              ))}
              {/* Plain-language outbreak context — only for OUTBREAK alerts */}
              {alert.type === "OUTBREAK" && alert.metadata ? (() => {
                const meta = alert.metadata as any;
                const count: number | undefined = meta.count;
                const disease: string | undefined = meta.disease;
                const district: string | undefined = meta.district;
                const baselineMean: number | undefined = meta.baseline_mean;
                const thresholdEpidemic: number | undefined = meta.threshold_epidemic;
                const thresholdAlert: number | undefined = meta.threshold_alert;
                const isCluster: boolean = !!meta.is_cluster;

                const thresholdLabel =
                  count !== undefined && thresholdEpidemic !== undefined && count > thresholdEpidemic
                    ? "Epidemic Threshold"
                    : "Alert Threshold";

                const locationParts = [district].filter(Boolean).join(", ");
                const basePart = baselineMean !== undefined
                  ? ` The usual level for this area is around ${Math.round(baselineMean)} case${Math.round(baselineMean) === 1 ? "" : "s"} per day.`
                  : "";

                const summary = [
                  count !== undefined && disease
                    ? `In the last 7 days, ${count} ${count === 1 ? "case" : "cases"} of ${disease} ${count === 1 ? "was" : "were"} recorded${locationParts ? ` in ${locationParts}` : ""}.`
                    : null,
                  `This has passed the ${thresholdLabel} — above the usual level for this area.${basePart}`,
                  isCluster ? "Cases appear to be concentrated in a small area of the district." : null,
                ].filter(Boolean).join(" ");

                return summary ? (
                  <div className="mt-2 pt-2 border-t border-base-300">
                    <p className="text-xs text-base-content/60 leading-relaxed">{summary}</p>
                  </div>
                ) : null;
              })() : null}
            </div>
          ) : null}

          {/* Patient details (if present) */}
          {alert.metadata && ((alert.metadata as any).patientAge !== undefined || (alert.metadata as any).patientGender) ? (
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-xs text-base-content/50 uppercase tracking-wide mb-1">Patient</p>
              <p className="text-sm font-medium">
                {[
                  (alert.metadata as any).patientAge !== undefined
                    ? `${(alert.metadata as any).patientAge}-year-old`
                    : null,
                  (alert.metadata as any).patientGender
                    ? String((alert.metadata as any).patientGender).charAt(0).toUpperCase() +
                      String((alert.metadata as any).patientGender).slice(1).toLowerCase()
                    : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            </div>
          ) : null}

          {/* When — timestamps */}
          <div className="bg-base-200/50 p-4 rounded-lg grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-base-content/50 uppercase tracking-wide mb-1">Date Created</p>
              <p className="text-sm font-medium">
                {new Date(alert.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit"
                })}
              </p>
            </div>
            {alert.acknowledgedAt ? (
              <div>
                <p className="text-xs text-base-content/50 uppercase tracking-wide mb-1">Acknowledged</p>
                <p className="text-sm font-medium">
                  {new Date(alert.acknowledgedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit"
                  })}
                </p>
              </div>
            ) : null}
            {alert.resolvedAt ? (
              <div>
                <p className="text-xs text-base-content/50 uppercase tracking-wide mb-1">Resolved</p>
                <p className="text-sm font-medium">
                  {new Date(alert.resolvedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit"
                  })}
                </p>
              </div>
            ) : null}
          </div>

          {/* ── Notes section ────────────────────────────────── */}
          <div className="bg-base-200/50 p-4 rounded-lg space-y-3">
            <p className="text-sm text-base-content/60 font-medium">
              Notes {notes.length > 0 ? `(${notes.length})` : null}
            </p>

            {notes.length === 0 ? (
              <p className="text-sm text-base-content/40">No notes yet.</p>
            ) : null}

            {notes.map((note) => (
              <div key={note.id} className="bg-base-100 rounded-lg p-3 text-sm space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{note.authorName ?? "Clinician"}</span>
                  <span className="text-xs text-base-content/40">
                    {new Date(note.updatedAt).toLocaleString()}
                    {note.updatedAt !== note.createdAt ? " (edited)" : null}
                  </span>
                </div>

                {editingNoteId === note.id ? (
                  <div className="space-y-2 mt-2">
                    <textarea
                      className="textarea textarea-bordered w-full text-sm resize-none"
                      rows={3}
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      maxLength={2000}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={handleCancelEdit}
                        disabled={isSavingEdit}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-primary btn-xs"
                        onClick={handleSaveEdit}
                        disabled={isSavingEdit || !editingContent.trim()}
                      >
                        {isSavingEdit ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-base-content/80 leading-relaxed whitespace-pre-wrap flex-1">
                      {note.content}
                    </p>
                    {currentUserId !== null && note.authorId === currentUserId ? (
                      <button
                        className="btn btn-ghost btn-xs text-base-content/40 shrink-0"
                        onClick={() => handleStartEdit(note)}
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            ))}

            {/* Add note form */}
            <div className="space-y-2 pt-1">
              <textarea
                className="textarea textarea-bordered w-full text-sm resize-none"
                rows={3}
                placeholder="Add a note…"
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                maxLength={2000}
              />
              {noteError ? (
                <p className="text-xs text-error">{noteError}</p>
              ) : null}
              <div className="flex justify-end">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAddNote}
                  disabled={isSubmittingNote || !newNoteContent.trim()}
                >
                  {isSubmittingNote ? "Adding…" : "Add Note"}
                </button>
              </div>
            </div>
          </div>

          {/* ── Next steps / Action buttons ──────────────────── */}
          <div className="flex gap-2 justify-end pt-2 items-center flex-wrap">
            {alert.diagnosisId ? (
              <span className="text-xs text-base-content/30 mr-auto">Case ref: #{alert.diagnosisId}</span>
            ) : null}
            {((alert.type === "ANOMALY" && (alert.metadata as any)?.latitude) ||
              (alert.type === "OUTBREAK" && (alert.metadata as any)?.district)) ? (
              <button
                className="btn btn-outline border-border btn-sm"
                onClick={handleViewOnMap}
              >
                <MapPin className="w-4 h-4 mr-1" /> View on map
              </button>
            ) : null}
            
            {(isPending || isAcknowledged) ? (
              <>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleResolve}
                  disabled={isResolving || isAcknowledging || isDismissing}
                >
                  {isResolving ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Resolving...
                    </>
                  ) : (
                    "Mark as Resolved"
                  )}
                </button>
                {isPending ? (
                  <>
                    <button
                      className="btn btn-sm btn-outline border-primary/30 hover:bg-primary hover:border-primary text-primary hover:text-primary-content h-8 min-h-0"
                      onClick={handleAcknowledge}
                      disabled={isResolving || isAcknowledging || isDismissing}
                    >
                      {isAcknowledging ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          Wait...
                        </>
                      ) : (
                        "Acknowledge"
                      )}
                    </button>
                    <button
                      className="btn btn-outline border-border btn-sm"
                      onClick={handleDismiss}
                      disabled={isResolving || isAcknowledging || isDismissing}
                    >
                      {isDismissing ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          Wait...
                        </>
                      ) : (
                        "Dismiss"
                      )}
                    </button>
                  </>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </dialog>
  );
}
