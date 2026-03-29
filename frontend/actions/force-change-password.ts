"use server";

import { actionClient } from "./client";
import { ResetPasswordSchema } from "@/schemas/ResetPasswordSchema";
import prisma from "@/prisma/prisma";
import { createClient } from "@/utils/supabase/server";
import { getCurrentDbUser } from "@/utils/user";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Force change password action for patients with mustChangePassword flag.
 * This action:
 * 1. Verifies the user is authenticated
 * 2. Updates the password in Supabase
 * 3. Clears the mustChangePassword flag in the database
 * 4. Redirects to the home page
 */
export const forceChangePassword = actionClient
  .inputSchema(ResetPasswordSchema)
  .action(async ({ parsedInput }) => {
    const { password } = parsedInput;

    // Get the authenticated user
    const { success: dbUser, error: userError } = await getCurrentDbUser();

    if (userError || !dbUser) {
      return { error: "You must be logged in to change your password." };
    }

    // Verify the user has the mustChangePassword flag
    // (This is a soft check - we still allow the password change even if not required)
    
    try {
      const supabase = await createClient();

      // Update password in Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        console.error("Error updating password:", updateError);
        return { error: `Failed to update password: ${updateError.message}` };
      }

      // Clear the mustChangePassword flag
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { mustChangePassword: false },
      });

      // Revalidate user cache
      if (dbUser.authId) {
        revalidateTag(`user-${dbUser.authId}`, { expire: 0 });
      }
      revalidatePath("/", "layout");

      // Redirect to home (this will then take them to onboarding if needed)
      redirect("/");
    } catch (error) {
      // Check if it's a redirect (Next.js throws this as an error)
      if (error instanceof Error && error.message === "NEXT_REDIRECT") {
        throw error;
      }

      console.error("Error in forceChangePassword:", error);
      return {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while updating your password.",
      };
    }
  });
