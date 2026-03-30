"use client";

import { useState, useEffect } from "react";
import { useAction } from "next-safe-action/hooks";
import { addDiagnosisNote } from "@/actions/add-diagnosis-note";
import { Loader2, AlertTriangle, Send } from "lucide-react";
import type { DiagnosisNoteRow } from "./healthcare-reports-page/columns";

interface DiagnosisNotesSectionProps {
  diagnosisId: number;
  notes: DiagnosisNoteRow[];
}

export function DiagnosisNotesSection({
  diagnosisId,
  notes,
}: DiagnosisNotesSectionProps) {
  const [localNotes, setLocalNotes] = useState<DiagnosisNoteRow[]>(notes);
  const [newNote, setNewNote] = useState("");

  // Keep localNotes synced if parent repasses updated props
  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  const { execute, status, result } = useAction(addDiagnosisNote, {
    onSuccess: ({ data }) => {
      setNewNote("");
      if (data?.note) {
        setLocalNotes((prev) => [data.note as DiagnosisNoteRow, ...prev]);
      }
    },
  });

  const isExecuting = status === "executing";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    execute({
      diagnosisId,
      content: newNote.trim(),
    });
  };

  return (
    <div className="bg-base-200 p-4 rounded-lg space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="font-medium text-sm">Clinical Notes</h4>
      </div>

      {localNotes.length > 0 ? (
        <div className="space-y-3">
          {localNotes.map((note) => (
            <div key={note.id} className="bg-base-100 p-3 rounded-lg text-sm border border-base-300">
              <p className="whitespace-pre-wrap">{note.content}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-base-300/50 text-xs text-base-content/50">
                <span className="font-medium">{note.clinician.name || "Clinician"}</span>
                <span>{new Date(note.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-base-content/50 italic bg-base-100 p-3 rounded-lg border border-base-300/50">
          No clinical notes added yet.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-base-300">
        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-2 mb-1 px-0">
            <span className="label-text font-medium text-sm">Add a new note</span>
          </label>
          <div className="flex flex-col gap-2">
            <textarea
              className="textarea textarea-bordered bg-base-100 h-20 w-full resize-none text-sm placeholder:text-base-content/40 focus:border-primary"
              placeholder="Type your general observations or clinical reasoning here..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              disabled={isExecuting}
              maxLength={1000}
            />
            
            {result?.serverError && (
              <div className="alert alert-error py-2 text-sm rounded-lg">
                <AlertTriangle className="size-4" />
                <span>{result.serverError}</span>
              </div>
            )}

            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-base-content/50 font-mono">
                {newNote.length}/1000
              </span>
              <button
                type="submit"
                className="btn btn-sm btn-primary gap-2 w-32"
                disabled={isExecuting || !newNote.trim()}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Posting
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
                    Post Note
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
