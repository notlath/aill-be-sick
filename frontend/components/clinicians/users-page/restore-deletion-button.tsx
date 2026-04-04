"use client";

import { RotateCcw } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { restorePatientDeletion } from "@/actions/restore-patient-deletion";

export function RestoreButton({ patientId }: { patientId: number }) {
  const { execute, status } = useAction(restorePatientDeletion, {
    onSuccess: () => {
      window.location.reload();
    },
  });

  return (
    <button
      type="button"
      onClick={() => execute({ patientId })}
      disabled={status === "executing"}
      className="btn btn-outline btn-sm border-success text-success hover:bg-success/10"
    >
      <RotateCcw className="w-4 h-4 mr-1" />
      {status === "executing" ? "Restoring..." : "Restore"}
    </button>
  );
}
