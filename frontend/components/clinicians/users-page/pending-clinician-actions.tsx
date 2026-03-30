"use client";

import {
  approveClinician,
  rejectClinician,
} from "@/actions/admin-clinician-approvals";
import { useAction } from "next-safe-action/hooks";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type PendingClinicianActionsProps = {
  clinicianUserId: number;
};

const PendingClinicianActions = ({
  clinicianUserId,
}: PendingClinicianActionsProps) => {
  const { execute: executeApprove, isExecuting: approving } = useAction(
    approveClinician,
    {
      onSuccess: ({ data }) => {
        if (data?.error) {
          toast.error(data.error);
          return;
        }

        toast.success("Clinician approved.");
      },
      onError: () => {
        toast.error("Failed to approve clinician.");
      },
    },
  );

  const { execute: executeReject, isExecuting: rejecting } = useAction(
    rejectClinician,
    {
      onSuccess: ({ data }) => {
        if (data?.error) {
          toast.error(data.error);
          return;
        }

        toast.success("Clinician rejected.");
      },
      onError: () => {
        toast.error("Failed to reject clinician.");
      },
    },
  );

  const isBusy = approving || rejecting;

  return (
    <div className="flex items-center gap-2 justify-end">
      <button
        type="button"
        disabled={isBusy}
        className="btn btn-sm btn-success"
        onClick={() => executeApprove({ clinicianUserId })}
      >
        {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
      </button>
      <button
        type="button"
        disabled={isBusy}
        className="btn btn-sm btn-error btn-outline"
        onClick={() => executeReject({ clinicianUserId })}
      >
        {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
      </button>
    </div>
  );
};

export default PendingClinicianActions;
