"use client";

import { useAction } from "next-safe-action/hooks";
import { Download, X, Trash2, FileText, ExternalLink } from "lucide-react";
import { exportUserData, withdrawConsent, deleteAccount } from "@/actions/privacy-actions";
import type { User, AuditLog } from "@/lib/generated/prisma";
import Link from "next/link";

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
          <h2 className="card-title">Your Consent Status</h2>
          <p className="text-base-content/70 text-sm">
            Below you can see which documents you have agreed to and when. Click &quot;Read Full Document&quot; to see the complete text you accepted.
          </p>

          <div className="grid gap-4 md:grid-cols-2 mt-2">
            {/* Privacy Policy Status */}
            <div className={`p-4 rounded-xl border ${user.privacyAcceptedAt ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className={`w-5 h-5 ${user.privacyAcceptedAt ? "text-success" : "text-warning"}`} />
                  <span className="font-semibold">Privacy Policy</span>
                </div>
                <span className={`badge ${user.privacyAcceptedAt ? "badge-success" : "badge-warning"}`}>
                  {user.privacyAcceptedAt ? "Accepted" : "Not Accepted"}
                </span>
              </div>
              {user.privacyAcceptedAt && (
                <div className="space-y-1 text-sm text-base-content/70">
                  <p>Accepted on {user.privacyAcceptedAt.toLocaleDateString()} at {user.privacyAcceptedAt.toLocaleTimeString()}</p>
                  {user.privacyVersion && <p>Version {user.privacyVersion}</p>}
                </div>
              )}
              <Link href="/privacy" className="btn btn-primary btn-sm gap-2 mt-3 w-full">
                <ExternalLink className="w-4 h-4" />
                Read Full Document
              </Link>
            </div>

            {/* Terms of Service Status */}
            <div className={`p-4 rounded-xl border ${user.termsAcceptedAt ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className={`w-5 h-5 ${user.termsAcceptedAt ? "text-success" : "text-warning"}`} />
                  <span className="font-semibold">Terms of Service</span>
                </div>
                <span className={`badge ${user.termsAcceptedAt ? "badge-success" : "badge-warning"}`}>
                  {user.termsAcceptedAt ? "Accepted" : "Not Accepted"}
                </span>
              </div>
              {user.termsAcceptedAt && (
                <div className="space-y-1 text-sm text-base-content/70">
                  <p>Accepted on {user.termsAcceptedAt.toLocaleDateString()} at {user.termsAcceptedAt.toLocaleTimeString()}</p>
                  {user.termsVersion && <p>Version {user.termsVersion}</p>}
                </div>
              )}
              <Link href="/terms" className="btn btn-primary btn-sm gap-2 mt-3 w-full">
                <ExternalLink className="w-4 h-4" />
                Read Full Document
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Consent Timeline */}
      <div className="card bg-base-100/80 backdrop-blur-sm rounded-2xl border border-border shadow-sm">
        <div className="card-body">
          <h2 className="card-title">Consent History</h2>
          <p className="text-base-content/70 text-sm">
            A timeline of all your consent-related actions on this account.
          </p>
          <div className="space-y-4 mt-2">
            {user.privacyAcceptedAt && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-success rounded-full mt-2 flex-shrink-0" />
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
                <div className="w-2 h-2 bg-success rounded-full mt-2 flex-shrink-0" />
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
                <div className="w-2 h-2 bg-info rounded-full mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{log.action.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-base-content/70">
                    {log.createdAt.toLocaleDateString()} at {log.createdAt.toLocaleTimeString()}
                  </p>
                  {log.details && (
                    <p className="text-xs text-base-content/50 mt-1 font-mono">
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
          <h2 className="card-title">Your Privacy Actions</h2>
          <p className="text-base-content/70 text-sm">
            Use these buttons to download your data, change your consent, or delete your account.
          </p>
          <div className="flex flex-wrap gap-4 mt-2">
            <button
              onClick={handleExport}
              disabled={exportStatus === "executing"}
              className="btn btn-outline flex items-center gap-2"
            >
              <Download size={16} />
              {exportStatus === "executing" ? "Exporting..." : "Download My Data"}
            </button>
            <button
              onClick={handleWithdraw}
              disabled={withdrawStatus === "executing"}
              className="btn btn-warning flex items-center gap-2"
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
              {deleteStatus === "executing" ? "Deleting..." : "Delete My Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
