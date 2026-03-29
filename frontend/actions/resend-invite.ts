"use server";

import { actionClient } from "./client";
import { z } from "zod";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { getAuthUser } from "@/utils/user";
import prisma from "@/prisma/prisma";
import { canCreatePatient } from "@/utils/role-hierarchy";

const ResendInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resendInvite = actionClient
  .inputSchema(ResendInviteSchema)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    try {
      // Verify the current user is authenticated
      const authUser = await getAuthUser();
      if (!authUser) {
        return { error: "Not authenticated" };
      }

      // Verify the current user has permission to resend invites
      const currentUser = await prisma.user.findUnique({
        where: { authId: authUser.id },
        select: { role: true, approvalStatus: true },
      });

      if (!currentUser || !canCreatePatient(currentUser.role)) {
        return { error: "Permission denied" };
      }

      // Only clinicians need ACTIVE approval status; ADMIN and DEVELOPER bypass this check
      if (
        currentUser.role === "CLINICIAN" &&
        currentUser.approvalStatus !== "ACTIVE"
      ) {
        return { error: "Your clinician account is not active" };
      }

      // Create admin client (this has access to SUPABASE_SERVICE_ROLE_KEY)
      const supabaseAdmin = createAdminClient();
      // Create regular client for password reset operations
      const supabase = await createClient();

      // Check if the user exists in Supabase Auth
      const { data: existingUsers, error: listError } =
        await supabaseAdmin.auth.admin.listUsers();

      if (listError) {
        console.error("[resendInvite] Error listing users:", listError);
        return { error: "Failed to check user existence" };
      }

      const existingUser = existingUsers?.users?.find((u) => u.email === email);

      if (!existingUser) {
        return {
          error:
            "No account found with this email. Please create a patient account first.",
        };
      }

      // Attempt to resend the invitation
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

      const { error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${origin}/auth/callback?next=/patient/set-password`,
          data: {
            name: existingUser.user_metadata?.name || "",
            role: "PATIENT",
            userId: existingUser.id, // Add user ID for reference
          },
        });

      // If the error is that the email already exists, try sending a password reset instead
      if (
        inviteError &&
        inviteError.status === 422 &&
        inviteError.code === "email_exists"
      ) {
        // User exists but may not have password set - try password reset
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: `${origin}/auth/callback?next=/patient/set-password`,
          },
        );

        if (resetError) {
          console.error(
            "[resendInvite] Error sending password reset:",
            resetError,
          );
          return {
            error: `Failed to send password reset email: ${resetError.message}`,
          };
        }

        return {
          success: true,
          message: `Password reset email sent to ${email}. The user can now set their password.`,
        };
      }

      // If there was another error with the invite, return it
      if (inviteError) {
        console.error("[resendInvite] Error:", inviteError);
        return { error: `Failed to resend invite: ${inviteError.message}` };
      }

      return { success: true, message: `Invite email sent to ${email}` };
    } catch (err) {
      console.error("[resendInvite] Unexpected error:", err);
      return { error: "An unexpected error occurred. Please try again." };
    }
  });
