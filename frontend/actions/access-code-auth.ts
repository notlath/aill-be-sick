"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { actionClient } from "./client";
import { AccessCodeAuthSchema } from "@/schemas/AccessCodeAuthSchema";
import prisma from "@/prisma/prisma";

/**
 * Login for patients who use access codes instead of email.
 * 
 * Flow:
 * 1. Look up the user by their access code (PAT-XXXXXX)
 * 2. Retrieve their placeholder email from the database
 * 3. Sign in with Supabase using the placeholder email + password
 */
export const accessCodeLogin = actionClient
  .inputSchema(AccessCodeAuthSchema)
  .action(async ({ parsedInput }) => {
    const { accessCode, password } = parsedInput;

    // Step 1: Find the user by their access code
    const user = await prisma.user.findUnique({
      where: { patientAccessCode: accessCode },
      select: { 
        email: true, 
        role: true,
        approvalStatus: true,
      },
    });

    if (!user) {
      return { error: "Invalid access code. Please check your code and try again." };
    }

    if (!user.email) {
      // This shouldn't happen if the access code exists, but handle edge case
      return { error: "Account configuration error. Please contact your clinician." };
    }

    if (user.role !== "PATIENT") {
      return { error: "Access code login is only available for patients." };
    }

    if (user.approvalStatus !== "ACTIVE") {
      return { error: "Your account is not active. Please contact your clinician." };
    }

    // Step 2: Sign in with Supabase using the placeholder email
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (error) {
      // Map Supabase errors to user-friendly messages
      if (error.message.includes("Invalid login credentials")) {
        return { error: "Invalid password. Please try again." };
      }
      console.error(`Access code login error: ${error.message}`);
      return { error: `Login failed: ${error.message}` };
    }

    revalidatePath("/", "layout");
    redirect("/");
  });
