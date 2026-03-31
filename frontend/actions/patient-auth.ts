"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { actionClient } from "./client";
import { EmailAuthSchema } from "@/schemas/EmailAuthSchema";
import { SignupWithConsentSchema } from "@/schemas/SignupWithConsentSchema";

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
    redirect("/diagnosis");
  });

export const patientSignup = actionClient
  .inputSchema(SignupWithConsentSchema)
  .action(async () => {
    return {
      error:
        "Patient accounts are created by clinicians only. Please contact your clinician for account access.",
    };
  });
