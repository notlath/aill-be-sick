"use server";

import * as z from "zod";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { actionClient } from "./client";
import { EmailAuthSchema } from "@/schemas/EmailAuthSchema";
import prisma from "@/prisma/prisma";

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

    revalidatePath("/", "layout");
    redirect("/");
  });

export const emailSignup = actionClient
  .inputSchema(EmailAuthSchema)
  .action(async ({ parsedInput }) => {
    const { email, password } = parsedInput;
    const supabase = await createClient();

    const appUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_VERCEL_URL ??
      "http://localhost:3000";

    const allowedEmail = await prisma.allowedClinicianEmail.findUnique({
      where: { email },
    });

    if (!allowedEmail) {
      return {
        error:
          "Your email is not authorized to register as a clinician. Please contact your administrator.",
      };
    }

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
      },
    });

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
        },
        update: {},
      });

      await prisma.allowedClinicianEmail.delete({
        where: { email },
      });
    }

    revalidatePath("/", "layout");
  });

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

export const updatePassword = actionClient
  .inputSchema(z.object({ password: z.string().min(6) }))
  .action(async ({ parsedInput }) => {
    const { password } = parsedInput;
    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error(`Error updating password: ${error.message}`);
      return { error: `Error updating password: ${error.message}` };
    }

    revalidatePath("/", "layout");
    redirect("/");
  });
