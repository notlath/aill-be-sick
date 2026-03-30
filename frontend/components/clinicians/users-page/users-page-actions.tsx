"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { canCreatePatient } from "@/utils/role-hierarchy";
import ResendInviteModal from "./resend-invite-modal";

interface UsersPageActionsProps {
  currentUserRole: string;
  userId?: string;
  userEmail?: string;
}

export default function UsersPageActions({
  currentUserRole,
  userId,
  userEmail,
}: UsersPageActionsProps) {
  const [isResendInviteModalOpen, setIsResendInviteModalOpen] = useState(false);
  const canResendInvite = canCreatePatient(currentUserRole);

  const handleResendInvite = () => {
    setIsResendInviteModalOpen(true);
  };

  return (
    <>
      {canResendInvite && userId && userEmail && (
        <button
          onClick={handleResendInvite}
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
        userId={userId}
        userEmail={userEmail}
      />
    </>
  );
}
