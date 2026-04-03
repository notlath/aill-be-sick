"use client";

import { useAction } from "next-safe-action/hooks";
// Using DaisyUI classes directly
import { Download, X, Trash2 } from "lucide-react";
import { exportUserData, withdrawConsent, deleteAccount } from "@/actions/privacy-actions";
import type { User, AuditLog } from "@/lib/generated/prisma";

interface PrivacyRightsContentProps {
  user: User;
  consentLogs: AuditLog[];
}

export default function PrivacyRightsContent({ user, consentLogs }: PrivacyRightsContentProps) {
  const { execute: executeExport, status: exportStatus } = useAction(exportUserData);
  const { execute: executeWithdraw, status: withdrawStatus } = useAction(withdrawConsent);
  const { execute: executeDelete, status: deleteStatus } = useAction(deleteAccount);

  const handleExport = () => {
    executeExport();
  };

  const handleWithdraw = () => {
    if (confirm("Are you sure you want to withdraw your consent? This will stop data collection but may limit service access.")) {
      executeWithdraw();
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      executeDelete();
    }
  };

  return (
    <div className="space-y-8">
      {/* Current Status */}
      <div className="card bg-base-100/80 backdrop-blur-sm rounded-2xl border border-border shadow-sm">
        <div className="card-body">
          <h2 className="card-title">Current Consent Status</h2>
          <div className="flex flex-wrap gap-4">
            <span className={`badge ${user.privacyAcceptedAt ? "badge-primary" : "badge-secondary"}`}>
              Privacy Policy {user.privacyAcceptedAt ? "Accepted" : "Not Accepted"}
            </span>
            <span className={`badge ${user.termsAcceptedAt ? "badge-primary" : "badge-secondary"}`}>
              Terms of Service {user.termsAcceptedAt ? "Accepted" : "Not Accepted"}
            </span>
            {user.privacyVersion && (
              <span className="badge badge-outline">Privacy Version: {user.privacyVersion}</span>
            )}
            {user.termsVersion && (
              <span className="badge badge-outline">Terms Version: {user.termsVersion}</span>
            )}
          </div>
        </div>
      </div>

      {/* Consent Timeline */}
      <div className="card bg-base-100/80 backdrop-blur-sm rounded-2xl border border-border shadow-sm">
        <div className="card-body">
          <h2 className="card-title">Consent History</h2>
          <div className="space-y-4">
            {user.privacyAcceptedAt && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Privacy Policy Accepted</p>
                  <p className="text-sm text-base-content/70">
                    {user.privacyAcceptedAt.toLocaleDateString()} at {user.privacyAcceptedAt.toLocaleTimeString()}
                    {user.privacyVersion && ` (Version ${user.privacyVersion})`}
                  </p>
                </div>
              </div>
            )}
            {user.termsAcceptedAt && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Terms of Service Accepted</p>
                  <p className="text-sm text-base-content/70">
                    {user.termsAcceptedAt.toLocaleDateString()} at {user.termsAcceptedAt.toLocaleTimeString()}
                    {user.termsVersion && ` (Version ${user.termsVersion})`}
                  </p>
                </div>
              </div>
            )}
            {consentLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-secondary rounded-full mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{log.action.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-base-content/70">
                    {log.createdAt.toLocaleDateString()} at {log.createdAt.toLocaleTimeString()}
                  </p>
                  {log.details && (
                    <p className="text-sm text-base-content/70 mt-1">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {(!user.privacyAcceptedAt && !user.termsAcceptedAt && consentLogs.length === 0) && (
              <p className="text-base-content/50">No consent history available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Privacy Actions */}
      <div className="card bg-base-100/80 backdrop-blur-sm rounded-2xl border border-border shadow-sm">
        <div className="card-body">
          <h2 className="card-title">Privacy Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleExport}
              disabled={exportStatus === "executing"}
              className="btn btn-outline flex items-center gap-2"
            >
              <Download size={16} />
              {exportStatus === "executing" ? "Exporting..." : "Export Data"}
            </button>
            <button
              onClick={handleWithdraw}
              disabled={withdrawStatus === "executing"}
              className="btn btn-secondary flex items-center gap-2"
            >
              <X size={16} />
              {withdrawStatus === "executing" ? "Withdrawing..." : "Withdraw Consent"}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteStatus === "executing"}
              className="btn btn-error flex items-center gap-2"
            >
              <Trash2 size={16} />
              {deleteStatus === "executing" ? "Deleting..." : "Delete Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}