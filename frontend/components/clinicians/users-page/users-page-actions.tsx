"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { isAdminLike } from "@/utils/role-hierarchy";
import ResendInviteModal from "./resend-invite-modal";

interface UsersPageActionsProps {
  currentUserRole: string;
}

export default function UsersPageActions({
  currentUserRole,
}: UsersPageActionsProps) {
  const [isResendInviteModalOpen, setIsResendInviteModalOpen] = useState(false);
  const canResendInvite = isAdminLike(currentUserRole);

  return (
    <>
      {canResendInvite && (
        <button
          onClick={() => setIsResendInviteModalOpen(true)}
          className="btn btn-outline btn-sm gap-2"
          type="button"
        >
          <Mail className="w-4 h-4" />
          Resend Invite
        </button>
      )}

      <ResendInviteModal
        isOpen={isResendInviteModalOpen}
        onClose={() => setIsResendInviteModalOpen(false)}
      />
    </>
  );
}
