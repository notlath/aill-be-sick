"use client";

import { useEffect, useRef, useState } from "react";
import type { Alert, AlertNote } from "@/types";
import { getReasonLabel, getReasonDescription } from "@/utils/anomaly-reasons";
import { getSeverityBadgeClass, getSeverityLabel } from "@/utils/alert-severity";

const typeLabel: Record<Alert["type"], string> = {
  ANOMALY: "Anomaly",
  OUTBREAK: "Outbreak",
  LOW_CONFIDENCE: "Low Confidence",
  HIGH_UNCERTAINTY: "High Uncertainty",
};

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
        <form method="dialog">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4">
            ✕
          </button>
        </form>
        <h3 className="font-bold text-2xl mb-6">Alert Details</h3>

        <div className="space-y-4">
          {/* Core fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Type</p>
              <p className="font-medium">{typeLabel[alert.type]}</p>
            </div>
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Severity</p>
              <span className={`badge ${getSeverityBadgeClass(alert.severity)}`}>
                {getSeverityLabel(alert.severity)}
              </span>
            </div>
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Status</p>
              <span className={`badge ${statusBadgeClass[alert.status]}`}>
                {statusLabel[alert.status]}
              </span>
            </div>
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-1">Diagnosis ID</p>
              <p className="font-medium">{alert.diagnosisId ?? "—"}</p>
            </div>
          </div>

          <div className="bg-base-200/50 p-4 rounded-lg">
            <p className="text-sm text-base-content/60 mb-1">Message</p>
            <p className="text-sm leading-relaxed">{alert.message}</p>
          </div>

          {alert.reasonCodes.length > 0 ? (
            <div className="bg-base-200/50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-base-content/60 mb-2">Reason Codes</p>
              {alert.reasonCodes.map((code) => (
                <div key={code}>
                  <p className="text-sm font-medium">{getReasonLabel(code)}</p>
                  <p className="text-xs text-base-content/60 mt-0.5">
                    {getReasonDescription(code)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {alert.metadata ? (
            <div className="bg-base-200/50 p-4 rounded-lg">
              <p className="text-sm text-base-content/60 mb-2">Additional Info</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {(alert.metadata as any).disease ? (
                  <>
                    <span className="text-base-content/60">Disease</span>
                    <span className="font-medium">{(alert.metadata as any).disease}</span>
                  </>
                ) : null}
                {(alert.metadata as any).city ? (
                  <>
                    <span className="text-base-content/60">City</span>
                    <span className="font-medium">{(alert.metadata as any).city}</span>
                  </>
                ) : null}
                {(alert.metadata as any).district ? (
                  <>
                    <span className="text-base-content/60">District</span>
                    <span className="font-medium">{(alert.metadata as any).district}</span>
                  </>
                ) : null}
                {(alert.metadata as any).province ? (
                  <>
                    <span className="text-base-content/60">Province</span>
                    <span className="font-medium">{(alert.metadata as any).province}</span>
                  </>
                ) : null}
                {(alert.metadata as any).anomalyScore !== undefined ? (
                  <>
                    <span className="text-base-content/60">Anomaly Score</span>
                    <span className="font-medium">
                      {Number((alert.metadata as any).anomalyScore).toFixed(4)}
                    </span>
                  </>
                ) : null}
                {(alert.metadata as any).confidence !== undefined ? (
                  <>
                    <span className="text-base-content/60">Confidence</span>
                    <span className="font-medium">
                      {(Number((alert.metadata as any).confidence) * 100).toFixed(2)}%
                    </span>
                  </>
                ) : null}
                {(alert.metadata as any).patientAge !== undefined ? (
                  <>
                    <span className="text-base-content/60">Patient Age</span>
                    <span className="font-medium">{(alert.metadata as any).patientAge}</span>
                  </>
                ) : null}
                {(alert.metadata as any).patientGender ? (
                  <>
                    <span className="text-base-content/60">Patient Gender</span>
                    <span className="font-medium capitalize">
                      {String((alert.metadata as any).patientGender).toLowerCase()}
                    </span>
                  </>
                ) : null}
                {(alert.metadata as any).count !== undefined ? (
                  <>
                    <span className="text-base-content/60">Cases Detected (7d)</span>
                    <span className="font-medium">{(alert.metadata as any).count}</span>
                  </>
                ) : null}
                {(alert.metadata as any).baseline_mean !== undefined ? (
                  <>
                    <span className="text-base-content/60">Baseline Mean</span>
                    <span className="font-medium">
                      {Number((alert.metadata as any).baseline_mean).toFixed(2)}
                    </span>
                  </>
                ) : null}
                {(alert.metadata as any).threshold_alert !== undefined ? (
                  <>
                    <span className="text-base-content/60">Alert Threshold</span>
                    <span className="font-medium">
                      {Number((alert.metadata as any).threshold_alert).toFixed(2)}
                    </span>
                  </>
                ) : null}
                {(alert.metadata as any).threshold_epidemic !== undefined ? (
                  <>
                    <span className="text-base-content/60">Epidemic Threshold</span>
                    <span className="font-medium">
                      {Number((alert.metadata as any).threshold_epidemic).toFixed(2)}
                    </span>
                  </>
                ) : null}
                {(alert.metadata as any).is_cluster ? (
                  <>
                    <span className="text-base-content/60">High Density</span>
                    <span className="font-medium text-warning">Yes (K-Means)</span>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="bg-base-200/50 p-4 rounded-lg grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-base-content/60 mb-1">Date Created</p>
              <p className="font-medium">
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
                <p className="text-sm text-base-content/60 mb-1">Acknowledged At</p>
                <p className="font-medium">
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
                <p className="text-sm text-base-content/60 mb-1">Resolved At</p>
                <p className="font-medium">
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

          {/* ── Action buttons ───────────────────────────────── */}
          {(isPending || isAcknowledged) ? (
            <div className="flex gap-2 justify-end pt-2">
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
            </div>
          ) : null}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
