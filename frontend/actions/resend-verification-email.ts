"use server";

import { createClient } from "@/utils/supabase/server";
import { actionClient } from "./client";
import { getCurrentDbUser } from "@/utils/user";

/**
 * Resend the email verification link to the current user.
 * 
 * Only works for patients with real email addresses (not access code users).
 */
export const resendVerificationEmail = actionClient.action(async () => {
  const { success: dbUser, error: userError } = await getCurrentDbUser();

  if (userError || !dbUser) {
    return { error: "You must be logged in to resend the verification email." };
  }

  if (!dbUser.email) {
    return { error: "No email address found for your account." };
  }

  // Check if this is a real email (not a placeholder for access code users)
  if (dbUser.email.endsWith("@internal.ailbesick.local")) {
    return { error: "Access code accounts do not require email verification." };
  }

  // Check if already verified
  if (dbUser.emailVerified) {
    return { error: "Your email is already verified." };
  }

  const supabase = await createClient();

  // Get the app URL for the redirect
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    "http://localhost:3000";

  // Resend the verification email using Supabase
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: dbUser.email,
    options: {
      emailRedirectTo: `${appUrl}/auth/confirm`,
    },
  });

  if (error) {
    console.error(`Error resending verification email: ${error.message}`);
    
    // Handle rate limiting
    if (error.message.includes("rate") || error.message.includes("limit")) {
      return { 
        error: "Please wait a few minutes before requesting another verification email." 
      };
    }
    
    return { error: `Failed to send verification email: ${error.message}` };
  }

  return { success: true };
});
