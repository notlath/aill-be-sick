"use client";

import { useState, useRef, useCallback } from "react";
import { User, Upload, Trash2, Loader2, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  updateProfile,
  uploadAvatar,
  removeAvatar,
} from "@/actions/update-profile";
import {
  updateEmailAction,
  updatePasswordAction,
} from "@/actions/update-credentials";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useAction } from "next-safe-action/hooks";
import Image from "next/image";

interface ProfileState {
  name: string;
  email: string;
  avatar: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  birthday: string | null;
}

interface ProfileFormProps {
  user: ProfileState;
}

const GRADIENT_STYLE = {
  backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')`,
} as const;

export default function ClinicianProfileForm({
  user: initialUser,
}: ProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialUser.name || "");
  const [email, setEmail] = useState(initialUser.email || "");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<string | null>(initialUser.avatar);
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER" | "">(
    initialUser.gender || "",
  );
  const [birthday, setBirthday] = useState(initialUser.birthday || "");

  // Update actions
  const { execute: executeUpdateProfile, isExecuting: isUpdatingProfile } =
    useAction(updateProfile, {
      onSuccess: ({ data }) => {
        if (data?.success) toast.success("Profile updated successfully");
        else if (data?.error) toast.error(data.error);
      },
      onError: () => toast.error("Failed to update profile"),
    });

  const { execute: executeUpdateEmail, isExecuting: isUpdatingEmail } =
    useAction(updateEmailAction, {
      onSuccess: ({ data }) => {
        if (data?.success)
          toast.success(
            "Email updated successfully - check your inbox to confirm.",
          );
        else if (data?.error) toast.error(data.error);
      },
      onError: () => toast.error("Failed to update email"),
    });

  const { execute: executeUpdatePassword, isExecuting: isUpdatingPassword } =
    useAction(updatePasswordAction, {
      onSuccess: ({ data }) => {
        if (data?.success) {
          toast.success("Password updated successfully");
          setPassword(""); // clear password input
        } else if (data?.error) toast.error(data.error);
      },
      onError: () => toast.error("Failed to update password"),
    });

  // Avatar Actions
  const { execute: executeUploadAvatar, isExecuting: isUploadingAvatar } =
    useAction(uploadAvatar, {
      onSuccess: ({ data }) => {
        if (data?.success && data.avatarUrl) {
          setAvatar(data.avatarUrl);
          toast.success("Avatar updated successfully");
        } else if (data?.error) toast.error(data.error);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      onError: () => {
        toast.error("Failed to upload avatar");
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });

  const { execute: executeRemoveAvatar } = useAction(removeAvatar, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setAvatar(null);
        toast.success("Avatar removed successfully");
      } else if (data?.error) toast.error(data.error);
    },
    onError: () => toast.error("Failed to remove avatar"),
  });

  // Handlers
  const handleProfileSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      executeUpdateProfile({
        name,
        gender: gender || undefined,
        birthday: birthday || undefined,
      });
    },
    [executeUpdateProfile, name, gender, birthday],
  );

  const handleEmailSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      executeUpdateEmail({ email });
    },
    [executeUpdateEmail, email],
  );

  const handlePasswordSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      executeUpdatePassword({ password });
    },
    [executeUpdatePassword, password],
  );

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

  return (
    <div className="space-y-10">
      {/* Profile Info Section */}
      <section className="bg-base-100/80 backdrop-blur-sm rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="relative h-32 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20">
          <div className="absolute inset-0 opacity-40" style={GRADIENT_STYLE} />
        </div>

        <div className="relative px-8 pb-8">
          {/* Avatar Component */}
          <div className="relative -mt-16 mb-6">
            <div className="relative inline-block">
              <div className="w-32 h-32 relative rounded-full bg-base-100 shadow-lg border-4 border-base-100 overflow-hidden flex items-center justify-center">
                {avatar ? (
                  <Image
                    src={avatar}
                    fill
                    alt={name || "Profile"}
                    className="object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-muted" />
                )}
              </div>

              <label
                className={`absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center cursor-pointer shadow-md transition-all duration-200 ${isUploadingAvatar ? "opacity-50 cursor-not-allowed" : ""}`}
              >
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
            </div>

            {avatar && (
              <button
                onClick={() => executeRemoveAvatar()}
                className="absolute bottom-0 right-0 mt-24 w-8 h-8 rounded-full bg-error hover:bg-error/90 flex items-center justify-center shadow-md transition-all duration-200 group"
                title="Remove avatar"
              >
                <Trash2 className="w-4 h-4 text-error-content group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>

          <form
            onSubmit={handleProfileSubmit}
            className="grid gap-6 md:grid-cols-2"
          >
            <div className="space-y-2">
              <label className="text-sm block font-medium text-base-content">
                Name
              </label>
              <Input
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full"
              />
            </div>

            <div className="space-y-2 w-full">
              <label className="text-sm block font-medium text-base-content">
                Gender
              </label>
              <Select
                className="w-full"
                value={gender}
                onValueChange={(value) =>
                  setGender(value as "MALE" | "FEMALE" | "OTHER")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm block font-medium text-base-content">
                Birthday
              </label>
              <Input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="btn btn-primary rounded-[10px] px-6 min-w-[100px]"
              >
                {isUpdatingProfile ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Save Profile"
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Account Settings Section */}
      <section className="bg-base-100/80 backdrop-blur-sm rounded-2xl border border-border shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-base-content">
              Account Credentials
            </h2>
            <p className="text-sm text-muted">
              Update your email address or password.
            </p>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Email Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm block font-medium text-base-content">
                Email Address
              </label>
              <div className="relative">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-10"
                />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isUpdatingEmail || email === initialUser.email}
                className="btn rounded-[10px] px-6"
              >
                {isUpdatingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Update Email
              </button>
            </div>
          </form>

          {/* Password Form */}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm block font-medium text-base-content">
                New Password
              </label>
              <div className="relative">
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-10"
                  minLength={6}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isUpdatingPassword || password.length < 6}
                className="btn rounded-[10px] px-6"
              >
                {isUpdatingPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Update Password
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
