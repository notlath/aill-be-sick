"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createClient } from "@supabase/supabase-js";

interface ResendInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userEmail?: string;
}

export default function ResendInviteModal({
  isOpen,
  onClose,
  userId,
  userEmail,
}: ResendInviteModalProps) {
  const [email, setEmail] = useState(userEmail || "");
  const [isSending, setIsSending] = useState(false);

  const handleResendInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    // If we have a userId from the table, use that email instead of the input
    const targetEmail = userId && userEmail ? userEmail : email;

    if (!targetEmail?.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsSending(true);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceRoleKey) {
        toast.error("Configuration error. Please contact support.");
        setIsSending(false);
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // First, check if the user exists in Supabase Auth
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) => u.email === targetEmail,
      );

      if (!existingUser) {
        toast.error(
          "No account found with this email. Please create a patient account first.",
        );
        setIsSending(false);
        return;
      }

      // Resend the invite email
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

      const { error: inviteError } =
        await supabase.auth.admin.inviteUserByEmail(targetEmail, {
          redirectTo: `${origin}/auth/callback?next=/patient/set-password`,
          data: {
            name: existingUser.user_metadata?.name || "",
            role: "PATIENT",
          },
        });

      if (inviteError) {
        console.error("[Resend Invite] Error:", inviteError);
        toast.error(`Failed to resend invite: ${inviteError.message}`);
        setIsSending(false);
        return;
      }

      toast.success(`Invite email sent to ${targetEmail}`);
      if (!userId) {
        // Only clear the email if we're in standalone mode
        setEmail("");
      }
      onClose();
    } catch (err) {
      console.error("[Resend Invite] Unexpected error:", err);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Resend Invite Email</h3>
          <button
            onClick={onClose}
            className="btn btn-sm btn-ghost btn-circle"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleResendInvite} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content">
              Patient Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@example.com"
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted">
              Enter the email address of the patient whose invite you want to
              resend. This will send a new invite link with a fresh 24-hour
              expiration.
            </p>
          </div>

          <div className="modal-action">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              disabled={isSending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Resend Invite
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
