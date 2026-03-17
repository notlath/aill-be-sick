"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { actionClient } from "./client";
import { EmailAuthSchema } from "@/schemas/EmailAuthSchema";
import { SignupWithConsentSchema } from "@/schemas/SignupWithConsentSchema";
import { LEGAL_CONSTANTS } from "@/constants/legal";

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

    revalidatePath("/", "layout");
    redirect("/");
  });

export const patientSignup = actionClient
  .inputSchema(SignupWithConsentSchema)
  .action(async ({ parsedInput }) => {
    const {
      email,
      password,
      acceptedMedicalDisclaimer,
      acceptedAgeRequirement,
      acceptedTermsAndPrivacy,
    } = parsedInput;

    // Verify all consent flags (enforced by schema, but double-check)
    if (
      !acceptedMedicalDisclaimer ||
      !acceptedAgeRequirement ||
      !acceptedTermsAndPrivacy
    ) {
      return { error: "All consent checkboxes must be accepted to sign up." };
    }

    const supabase = await createClient();

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_VERCEL_URL ??
      "http://localhost:3000";

    const { error, data } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
      }
    });

    if (error) {
      console.error(`Error signing up with email: ${error.message}`);
      return { error: `Error signing up: ${error.message}` };
    }

    if (data.user) {
      const prisma = (await import("@/prisma/prisma")).default;
      await prisma.user.upsert({
        where: { email: data.user.email },
        create: {
          email: data.user.email!,
          name: data.user.user_metadata?.name || "",
          authId: data.user.id,
          role: "PATIENT",
          // Store consent timestamps and versions
          termsAcceptedAt: new Date(),
          privacyAcceptedAt: new Date(),
          termsVersion: LEGAL_CONSTANTS.TERMS_VERSION,
          privacyVersion: LEGAL_CONSTANTS.PRIVACY_VERSION,
        },
        update: {
          // Also update consent if user already exists (edge case)
          termsAcceptedAt: new Date(),
          privacyAcceptedAt: new Date(),
          termsVersion: LEGAL_CONSTANTS.TERMS_VERSION,
          privacyVersion: LEGAL_CONSTANTS.PRIVACY_VERSION,
        },
      });
    }

    return { success: true };
  });
