"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Info, MoreHorizontal, KeyRound, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { regeneratePatientCredentials } from "@/actions/regenerate-patient-credentials";
import { toast } from "sonner";

export type UserRow = {
  id: number;
  name: string | null;
  email: string | null;
  gender: string | null;
  age: number | null;
  district: string | null;
  role: string;
  createdAt: Date;
  lastActivityAt: Date | null;
  patientAccessCode: string | null;
  emailVerified: boolean;
  _count: {
    diagnoses: number;
  };
};

// Separate component for the actions cell to use hooks
function ActionsCell({ row }: { row: { original: UserRow } }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState<{
    type: "email" | "accessCode";
    email?: string;
    accessCode?: string;
    temporaryPassword: string;
    patientName: string;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const { execute, isExecuting } = useAction(regeneratePatientCredentials, {
    onSuccess: ({ data }) => {
      if (data?.error) {
        toast.error(data.error);
      } else if (data?.success) {
        setCredentials({
          type: data.success.type,
          email: data.success.type === "email" ? data.success.email : undefined,
          accessCode:
            data.success.type === "accessCode"
              ? data.success.accessCode
              : undefined,
          temporaryPassword: data.success.temporaryPassword,
          patientName: data.success.patientName,
        });
        setShowCredentials(true);
        toast.success(data.success.message);
      }
      setIsOpen(false);
    },
    onError: () => {
      toast.error("An unexpected error occurred.");
      setIsOpen(false);
    },
  });

  const user = row.original;

  // Only show actions for PATIENT role
  if (user.role !== "PATIENT") {
    return <span className="text-muted">—</span>;
  }

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <>
      {/* Dropdown Menu */}
      <div className="dropdown dropdown-end">
        <button
          className="btn btn-ghost btn-sm btn-square"
          onClick={() => setIsOpen(!isOpen)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-[5]"
              onClick={() => setIsOpen(false)}
            />
            <ul className="dropdown-content z-10 menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-border">
              <li>
                <button
                  onClick={() => execute({ patientId: user.id })}
                  disabled={isExecuting}
                  className="flex items-center gap-2"
                >
                  <KeyRound className="h-4 w-4" />
                  {isExecuting ? "Resetting..." : "Reset Credentials"}
                </button>
              </li>
            </ul>
          </>
        )}
      </div>

      {/* Credentials Modal */}
      {showCredentials && credentials && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              New Credentials for {credentials.patientName}
            </h3>

            <div className="space-y-4">
              {credentials.type === "accessCode" && credentials.accessCode && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Access Code</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-base-200 px-3 py-2 rounded-lg font-mono text-lg">
                      {credentials.accessCode}
                    </code>
                    <button
                      onClick={() =>
                        handleCopy(credentials.accessCode!, "accessCode")
                      }
                      className="btn btn-ghost btn-sm btn-square"
                    >
                      {copied === "accessCode" ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {credentials.type === "email" && credentials.email && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-base-200 px-3 py-2 rounded-lg text-sm truncate">
                      {credentials.email}
                    </code>
                    <button
                      onClick={() => handleCopy(credentials.email!, "email")}
                      className="btn btn-ghost btn-sm btn-square"
                    >
                      {copied === "email" ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Temporary Password</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-base-200 px-3 py-2 rounded-lg font-mono">
                    {credentials.temporaryPassword}
                  </code>
                  <button
                    onClick={() =>
                      handleCopy(credentials.temporaryPassword, "password")
                    }
                    className="btn btn-ghost btn-sm btn-square"
                  >
                    {copied === "password" ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="alert alert-warning text-sm">
                <Info className="h-4 w-4" />
                <span>
                  Share these credentials securely with the patient. They will
                  be asked to change their password on next login.
                </span>
              </div>
            </div>

            <div className="modal-action">
              <button
                onClick={() => {
                  setShowCredentials(false);
                  setCredentials(null);
                }}
                className="btn"
              >
                Done
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button
              onClick={() => {
                setShowCredentials(false);
                setCredentials(null);
              }}
            >
              close
            </button>
          </form>
        </dialog>
      )}
    </>
  );
}

export const columns: ColumnDef<UserRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => {
      const name = row.getValue("name") as string | null;
      const email = row.original.email;
      const accessCode = row.original.patientAccessCode;
      const isAccessCodeUser = !!accessCode;

      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{name || "—"}</span>
          {isAccessCodeUser ? (
            <span className="text-xs text-muted font-mono">{accessCode}</span>
          ) : (
            <span className="text-xs text-muted">{email || "—"}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "age",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Age
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => {
      const age = row.getValue("age") as number | null;
      return <span>{age ?? "—"}</span>;
    },
  },
  {
    accessorKey: "gender",
    header: "Gender",
    filterFn: "equalsString",
    cell: ({ row }) => {
      const gender = row.getValue("gender") as string | null;
      return <span>{gender || "—"}</span>;
    },
  },
  {
    accessorKey: "district",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        District
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => {
      const district = row.getValue("district") as string | null;
      return (
        <div className="max-w-36 truncate" title={district || "—"}>
          {district || "—"}
        </div>
      );
    },
  },
  {
    id: "diagnoses",
    accessorFn: (row) => row._count.diagnoses,
    header: ({ column }) => (
      <div className="flex items-center gap-1">
        <button
          className="flex items-center gap-1 hover:text-primary"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Symptom Checks
          <ArrowUpDown className="w-4 h-4" />
        </button>
        <div className="tooltip tooltip-bottom z-50" data-tip="Number of times this person used the symptom checker">
          <Info className="w-3.5 h-3.5 text-muted cursor-default" />
        </div>
      </div>
    ),
    cell: ({ row }) => {
      const count = row.getValue("diagnoses") as number;
      return <span>{count}</span>;
    },
  },
  {
    accessorKey: "lastActivityAt",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Last Activity
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => {
      const date = row.getValue("lastActivityAt") as Date | null;
      if (!date) return <span className="text-muted">No activity</span>;
      return <span>{new Date(date).toLocaleDateString()}</span>;
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Joined
        <ArrowUpDown className="w-4 h-4" />
      </button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return <span>{date.toLocaleDateString()}</span>;
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <ActionsCell row={row} />,
  },
];
