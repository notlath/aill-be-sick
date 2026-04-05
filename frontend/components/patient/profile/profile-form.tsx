"use client";

import { useState, useRef, useCallback } from "react";
import {
  User,
  Upload,
  Trash2,
  Loader2,
  MapPin,
  Download,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { uploadAvatar, removeAvatar } from "@/actions/update-profile";
import { dataExport } from "@/actions/data-export";
// import { withdrawConsent } from "@/actions/withdraw-consent";
import { Badge } from "@/components/ui/badge";
import { useAction } from "next-safe-action/hooks";
import Image from "next/image";
import Link from "next/link";

const GRADIENT_STYLE = {
  backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')`,
} as const;

const FIXED_CITY = "Quezon City";
const FIXED_BARANGAY = "Bagong Silangan";
const FIXED_REGION = "National Capital Region (NCR)";
const FIXED_PROVINCE = "NCR, Second District";

interface ProfileState {
  name: string;
  email: string;
  avatar: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  barangay: string | null;
  address: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  birthday: string | null;
  privacyAcceptedAt: Date | null;
  privacyVersion: string | null;
  termsAcceptedAt: Date | null;
  termsVersion: string | null;
}

interface ProfileFormProps {
  user: ProfileState;
}

export default function ProfileForm({ user: initialUser }: ProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<string | null>(initialUser.avatar);
  // const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const { execute: executeUploadAvatar, isExecuting: isUploadingAvatar } =
    useAction(uploadAvatar, {
      onSuccess: ({ data }) => {
        if (data && "error" in data) {
          toast.error(data.error);
        } else if (data && "success" in data && data.avatarUrl) {
          setAvatar(data.avatarUrl);
          toast.success("Avatar updated successfully");
        }
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
      onError: () => {
        toast.error("Failed to upload avatar");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
    });

  const { execute: executeRemoveAvatar } = useAction(removeAvatar, {
    onSuccess: ({ data }) => {
      if (data && "error" in data) {
        toast.error(data.error);
      } else if (data && "success" in data) {
        setAvatar(null);
        toast.success("Avatar removed successfully");
      }
    },
    onError: () => {
      toast.error("Failed to remove avatar");
    },
  });

  const { execute: executeExportData, isExecuting: isExporting } = useAction(
    dataExport,
    {
      onSuccess: ({ data }) => {
        if (data && "success" in data && data.success && data.data) {
          const blob = new Blob([JSON.stringify(data.data, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "user-data.json";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success("Data exported successfully");
        } else if (data && "error" in data) {
          toast.error(data.error);
        }
      },
      onError: () => {
        toast.error("Failed to export data");
      },
    },
  );

  // const { execute: executeWithdrawConsent, isExecuting: isWithdrawing } =
  //   useAction(withdrawConsent, {
  //     onSuccess: ({ data }) => {
  //       if (data && "success" in data) {
  //         toast.success("Consent withdrawn successfully");
  //         setShowWithdrawModal(false);
  //         window.location.href = "/privacy";
  //       } else if (data && "error" in data) {
  //         toast.error(data.error);
  //       }
  //     },
  //     onError: () => {
  //       toast.error("Failed to withdraw consent");
  //     },
  //   });

  const handleAvatarUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("avatar", file);
      executeUploadAvatar({ formData });
    },
    [executeUploadAvatar],
  );

  const handleRemoveAvatar = useCallback(() => {
    executeRemoveAvatar();
  }, [executeRemoveAvatar]);

  const formatBirthday = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-10">
      {/* Profile Card */}
      <section className="rounded-2xl bg-base-200 border border-border shadow-sm">
        <div className="relative h-32 overflow rounded-t-2xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20">
          <div className="absolute inset-0 opacity-40" style={GRADIENT_STYLE} />
        </div>

        <div className="relative px-8 pb-8">
          {/* Avatar */}
          <div className="relative -mt-16 mb-6">
            <div className="relative inline-block">
              <div className="w-32 h-32 relative rounded-full bg-base-100 shadow-lg border-4 border-base-100 overflow-hidden flex items-center justify-center">
                {avatar ? (
                  <Image
                    src={avatar}
                    fill
                    alt={initialUser.name || "Profile"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-muted" />
                )}
              </div>

              <label className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center cursor-pointer shadow-md transition-all duration-200">
                {isUploadingAvatar ? (
                  <Loader2 className="w-5 h-5 text-primary-content animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 text-primary-content" />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={isUploadingAvatar}
                />
              </label>

              {avatar && (
                <button
                  onClick={handleRemoveAvatar}
                  className="absolute top-1 right-1 w-8 h-8 rounded-full bg-error hover:bg-error/90 flex items-center justify-center shadow-md transition-all duration-200 group"
                  title="Remove avatar"
                >
                  <Trash2 className="w-4 h-4 text-error-content group-hover:scale-110 transition-transform" />
                </button>
              )}
            </div>
          </div>

          {/* Profile Information */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted font-medium">
                Name
              </p>
              <p className="text-base font-medium">{initialUser.name || "—"}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted font-medium">
                Email
              </p>
              <p className="text-base font-medium">{initialUser.email}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted font-medium">
                Gender
              </p>
              <p className="text-base font-medium">
                {initialUser.gender || "—"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted font-medium">
                Birthday
              </p>
              <p className="text-base font-medium">
                {formatBirthday(initialUser.birthday)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section className="rounded-2xl bg-base-200 border border-border shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-base-content">
              Location
            </h2>
            <p className="text-sm text-muted">
              Your registered address for health service coverage
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <p className="text-xs uppercase tracking-wider text-muted font-medium">
              Street Address
            </p>
            <p className="text-base font-medium">
              {initialUser.address || "—"}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted font-medium">
              District / Zone
            </p>
            <p className="text-base font-medium">
              {initialUser.district || "—"}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted font-medium">
              Barangay
            </p>
            <p className="text-base font-medium">{FIXED_BARANGAY}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted font-medium">
              City / Municipality
            </p>
            <p className="text-base font-medium">{FIXED_CITY}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted font-medium">
              Province
            </p>
            <p className="text-base font-medium">{FIXED_PROVINCE}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted font-medium">
              Region
            </p>
            <p className="text-base font-medium">{FIXED_REGION}</p>
          </div>
        </div>
      </section>

      {/* Privacy Rights Section */}
      <section className="bg-base-100/80 backdrop-blur-sm rounded-2xl border border-border shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-base-content">
              Privacy Rights
            </h2>
            <p className="text-sm text-muted">
              Manage your data and privacy preferences
            </p>
          </div>
        </div>

        <div className="mb-6 p-4 bg-base-200/50 rounded-xl">
          <h3 className="font-medium text-base-content mb-2">Current Status</h3>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">Privacy Policy:</span>
              {initialUser.privacyAcceptedAt ? (
                <Badge
                  variant="default"
                  className="bg-success text-success-content text-xs"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Accepted v{initialUser.privacyVersion || "1.0"}
                </Badge>
              ) : (
                <Badge
                  variant="default"
                  className="bg-error text-error-content text-xs"
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Not Accepted
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Terms of Service:</span>
              {initialUser.termsAcceptedAt ? (
                <Badge
                  variant="default"
                  className="bg-success text-success-content text-xs"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Accepted v{initialUser.termsVersion || "1.0"}
                </Badge>
              ) : (
                <Badge
                  variant="default"
                  className="bg-error text-error-content text-xs"
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Not Accepted
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="card bg-base-100 border border-border">
            <div className="card-body p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                  <Download className="w-4 h-4 text-info" />
                </div>
                <h3 className="card-title text-sm">Export My Data</h3>
              </div>
              <p className="text-xs text-muted mb-4">
                Download a copy of all your personal data, diagnoses, and usage
                history.
              </p>
              <button
                onClick={() => executeExportData({ format: "json" })}
                disabled={isExporting}
                className="btn btn-info btn-sm w-full"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Export Data"
                )}
              </button>
            </div>
          </div>

          <div className="card bg-base-100 border border-border">
            <div className="card-body p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <h3 className="card-title text-sm">Privacy Dashboard</h3>
              </div>
              <p className="text-xs text-muted mb-4">
                View consent history, manage preferences, and access all privacy
                rights.
              </p>
              <Link
                href="/privacy-rights"
                className="btn btn-primary btn-sm w-full"
              >
                Open Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Withdraw Consent Modal temporarily disabled */}
      {/* {showWithdrawModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-warning" />
              <h3 className="font-bold text-lg">Withdraw Consent</h3>
            </div>
            <p className="py-4 text-sm">
              Withdrawing consent will block your access to the app until you
              re-accept the privacy policy and terms. Your data will remain
              intact. You can re-accept consent by visiting the privacy page.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowWithdrawModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-warning"
                disabled={isWithdrawing}
                onClick={() => {
                  executeWithdrawConsent();
                }}
              >
                {isWithdrawing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Withdraw Consent"
                )}
              </button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
}
