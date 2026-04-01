"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { actionClient } from "./client";
import { EmailAuthSchema } from "@/schemas/EmailAuthSchema";
import { SignupWithConsentSchema } from "@/schemas/SignupWithConsentSchema";
import prisma from "@/prisma/prisma";
import { getDefaultLandingPath } from "@/constants/default-landing-path";

export const patientLogin = actionClient
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
      return { error: `Error logging in: ${error.message}` };
    }

    // Check user role and redirect accordingly
    const user = await prisma.user.findUnique({
      where: { authId: data.user.id },
      select: { role: true, approvalStatus: true },
    });

    if (!user) {
      await supabase.auth.signOut();
      return { error: "Account not found. Please contact your administrator." };
    }

    revalidatePath("/", "layout");

    // Role-based redirect
    switch (user.role) {
      case "PATIENT":
      case "ADMIN":
      case "DEVELOPER":
        redirect(getDefaultLandingPath(user.role));
        break;
      case "CLINICIAN":
        if (user.approvalStatus === "ACTIVE") {
          redirect(getDefaultLandingPath(user.role));
        } else {
          await supabase.auth.signOut();
          return { error: "Your clinician account is not active yet." };
        }
        break;
      default:
        await supabase.auth.signOut();
        return { error: "Invalid account type." };
    }
  });

export const patientSignup = actionClient
  .inputSchema(SignupWithConsentSchema)
  .action(async () => {
    return {
      error:
        "Patient accounts are created by clinicians only. Please contact your clinician for account access.",
    };
  });
