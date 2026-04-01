"use server";

import * as z from "zod";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { actionClient } from "./client";
import { EmailAuthSchema } from "@/schemas/EmailAuthSchema";
import prisma from "@/prisma/prisma";
import { getDefaultLandingPath } from "@/constants/default-landing-path";

/**
 * Email Login Action
 *
 * This action only handles Supabase Email/Password flows.
 * Google Sign-In and other OAuth providers bypass this action entirely.
 */
export const emailLogin = actionClient
  .inputSchema(EmailAuthSchema)
  .action(async ({ parsedInput }) => {
    const { email, password } = parsedInput;
    const supabase = await createClient();

    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(`Error logging in with email: ${error.message}`);

      return { error: `Error logging in with email: ${error.message}` };
    }

    const user = await prisma.user.findUnique({
      where: { authId: data.user.id },
      select: { role: true, approvalStatus: true },
    });

    if (!user || user.role !== "CLINICIAN") {
      await supabase.auth.signOut();
      return {
        error: "This portal is for clinician accounts only.",
      };
    }

    if (user.approvalStatus === "PENDING_ADMIN_APPROVAL") {
      await supabase.auth.signOut();
      return {
        code: "PENDING_ADMIN_APPROVAL",
        error:
          "Your account is waiting for admin approval. Please check your email for updates.",
      };
    }

    if (user.approvalStatus === "REJECTED") {
      await supabase.auth.signOut();
      return {
        code: "REJECTED",
        error:
          "Your clinician account was not approved. Please contact your administrator.",
      };
    }

    revalidatePath("/", "layout");
    redirect(getDefaultLandingPath("CLINICIAN"));
  });

/**
 * Email Signup Action
 *
 * This action only handles Supabase Email signup flows.
 * For clinician registration via allowed email domains.
 */
export const emailSignup = actionClient
  .inputSchema(EmailAuthSchema)
  .action(async ({ parsedInput }) => {
    const { email, password } = parsedInput;
    const supabase = await createClient();

    const allowedEmail = await prisma.allowedClinicianEmail.findUnique({
      where: { email },
    });

    if (!allowedEmail) {
      return {
        error:
          "Your email is not authorized to register as a clinician. Please contact your administrator.",
      };
    }

    const { error, data } = await supabase.auth.signUp({ email, password });

    if (error) {
      console.error(`Error signing up with email: ${error.message}`);

      return { error: `Error signing up with email: ${error.message}` };
    }

    if (data.user) {
      await prisma.user.upsert({
        where: { email: data.user.email },
        create: {
          email: data.user.email!,
          name: data.user.user_metadata!.name || "",
          authId: data.user.id,
          role: "CLINICIAN",
          approvalStatus: "PENDING_ADMIN_APPROVAL",
        },
        update: {
          authId: data.user.id,
          role: "CLINICIAN",
          approvalStatus: "PENDING_ADMIN_APPROVAL",
          rejectedAt: null,
          approvedAt: null,
          approvalNotes: null,
          approvedBy: null,
        },
      });

      await prisma.allowedClinicianEmail.delete({
        where: { email },
      });
    }

    revalidatePath("/", "layout");
  });

/**
 * Request Password Reset Action
 *
 * This action only handles Supabase password reset email flows.
 * Sends a magic link for password reset via email.
 */
export const requestPasswordReset = actionClient
  .inputSchema(z.object({ email: z.string().email() }))
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;
    const supabase = await createClient();

    const appUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_VERCEL_URL ??
      "http://localhost:3000";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/clinician-reset-password`,
    });

    if (error) {
      console.error(`Error requesting password reset: ${error.message}`);
      return { error: `Error requesting password reset: ${error.message}` };
    }

    return { success: true };
  });

/**
 * Update Password Action
 *
 * This action only handles Supabase password update flows.
 * Used for password resets and initial password setting for patients.
 * On error, passes detailed error params to the callback URL for better UX.
 */
export const updatePassword = actionClient
  .inputSchema(z.object({ password: z.string().min(6) }))
  .action(async ({ parsedInput }) => {
    const { password } = parsedInput;
    const supabase = await createClient();

    // Get current session to debug the session state
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    console.log("[updatePassword] Current session:", {
      hasSession: !!sessionData?.session,
      sessionUserId: sessionData?.session?.user?.id,
      sessionEmail: sessionData?.session?.user?.email,
      sessionError: sessionError?.message,
    });

    // Get current user to debug the user state
    const { data: userData, error: userError } = await supabase.auth.getUser();
    console.log("[updatePassword] Current user:", {
      userId: userData?.user?.id,
      email: userData?.user?.email,
      emailConfirmedAt: userData?.user?.email_confirmed_at,
      userError: userError?.message,
    });

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error("[updatePassword] Error updating password:", {
        code: error.code,
        message: error.message,
        status: error.status,
      });

      // Pass detailed error for better UX (Rank 1: Detailed Error Query)
      // Error types: expired_link, invalid_token, session_expired
      const errorParam =
        error.code === "otp_expired" || error.code === "expired_token"
          ? "expired_link"
          : error.code === "invalid_token" || error.code === "invalid_grant"
            ? "invalid_token"
            : "session_expired";

      return { error: `Error updating password: ${error.message}`, errorParam };
    }

    console.log("[updatePassword] Password updated successfully");

    // Get the user's role to determine redirect
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const dbUser = await prisma.user.findUnique({
        where: { authId: user.id },
        select: { role: true },
      });

      revalidatePath("/", "layout");

      // Redirect based on role
      if (dbUser?.role === "CLINICIAN" || dbUser?.role === "ADMIN") {
        redirect("/map");
      } else if (dbUser?.role === "PATIENT") {
        redirect("/diagnosis");
      }
      redirect("/");
    }

    revalidatePath("/", "layout");
    redirect("/");
  });
