"use server";

import { actionClient } from "./client";
import { CreatePatientAccountSchema } from "@/schemas/CreatePatientAccountSchema";
import prisma from "@/prisma/prisma";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { getCurrentDbUser } from "@/utils/user";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

/**
 * Generates a secure temporary password
 * 12 characters with mix of upper, lower, digits, and special chars
 */
function generateTemporaryPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Removed I, O to avoid confusion
  const lower = "abcdefghjkmnpqrstuvwxyz"; // Removed i, l, o to avoid confusion
  const digits = "23456789"; // Removed 0, 1 to avoid confusion
  const special = "!@#$%&*";

  const allChars = upper + lower + digits + special;

  // Ensure at least one of each type
  let password = "";
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill remaining characters
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

/**
 * Generates a unique patient access code in format PAT-XXXXXX
 * Uses cryptographically secure random bytes
 */
function generatePatientAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous characters
  const bytes = crypto.randomBytes(6);
  let code = "PAT-";
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Generates a unique placeholder email for patients without email
 * Format: pat-{accessCode}@internal.ailbesick.local
 */
function generatePlaceholderEmail(accessCode: string): string {
  // Remove the PAT- prefix and make lowercase
  const codeWithoutPrefix = accessCode.replace("PAT-", "").toLowerCase();
  return `pat-${codeWithoutPrefix}@internal.ailbesick.local`;
}

export const createPatientAccount = actionClient
  .inputSchema(CreatePatientAccountSchema)
  .action(async ({ parsedInput }) => {
    const { name, email, birthday, hasEmail } = parsedInput;

    // Auth guard: verify the caller is a CLINICIAN or DEVELOPER
    const { success: dbUser, error: userError } = await getCurrentDbUser();

    if (userError || !dbUser) {
      return { error: "You must be logged in to perform this action." };
    }

    if (dbUser.role !== "CLINICIAN" && dbUser.role !== "DEVELOPER") {
      return { error: "Only clinicians can create patient accounts." };
    }

    try {
      // Generate temporary password (used for both flows)
      const temporaryPassword = generateTemporaryPassword();

      // Calculate age from birthday
      const birthdayDate = new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - birthdayDate.getFullYear();
      const monthDiff = today.getMonth() - birthdayDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthdayDate.getDate())
      ) {
        age--;
      }

      // ============================================
      // FLOW A: Patient HAS email address
      // ============================================
      if (hasEmail && email) {
        // Check if user already exists in Prisma
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          return { error: "A user with this email address already exists." };
        }

        // Get the app URL for email redirect
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL ??
          process.env.NEXT_PUBLIC_VERCEL_URL ??
          "http://localhost:3000";

        // Create Supabase auth user with email verification required
        const { data: authData, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password: temporaryPassword,
            email_confirm: false, // Require email verification
            user_metadata: {
              name,
              created_by_clinician: dbUser.id,
            },
          });

        if (authError) {
          console.error("Supabase auth error:", authError);
          return {
            error: `Failed to create authentication account: ${authError.message}`,
          };
        }

        if (!authData.user) {
          return { error: "Failed to create authentication account." };
        }

        // Send verification email via Supabase
        const { error: inviteError } =
          await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${appUrl}/auth/confirm`,
          });

        if (inviteError) {
          // Log but don't fail - the user can request resend later
          console.warn(
            "Failed to send verification email:",
            inviteError.message
          );
        }

        // Create the User row in Prisma
        const newUser = await prisma.user.create({
          data: {
            email,
            name,
            birthday: birthdayDate,
            age,
            authId: authData.user.id,
            role: "PATIENT",
            mustChangePassword: true,
            isOnboarded: false,
            emailVerified: false, // Will be set to true after email verification
          },
        });

        // Revalidate the users page
        revalidatePath("/users");

        return {
          success: {
            type: "email" as const,
            email: newUser.email!,
            temporaryPassword,
            userId: newUser.id,
            message:
              "A verification email has been sent to the patient. They must verify their email before using the app.",
          },
        };
      }

      // ============================================
      // FLOW B: Patient does NOT have email address
      // ============================================
      else {
        // Generate unique access code
        let accessCode = generatePatientAccessCode();
        let attempts = 0;
        const maxAttempts = 10;

        // Ensure access code is unique
        while (attempts < maxAttempts) {
          const existingCode = await prisma.user.findUnique({
            where: { patientAccessCode: accessCode },
          });
          if (!existingCode) break;
          accessCode = generatePatientAccessCode();
          attempts++;
        }

        if (attempts >= maxAttempts) {
          return {
            error:
              "Failed to generate unique access code. Please try again.",
          };
        }

        // Generate placeholder email for Supabase (internal use only)
        const placeholderEmail = generatePlaceholderEmail(accessCode);

        // Create Supabase auth user with placeholder email (auto-confirmed)
        const { data: authData, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email: placeholderEmail,
            password: temporaryPassword,
            email_confirm: true, // Auto-confirm since no real email
            user_metadata: {
              name,
              has_email: false,
              access_code: accessCode,
              created_by_clinician: dbUser.id,
            },
          });

        if (authError) {
          console.error("Supabase auth error:", authError);
          return {
            error: `Failed to create authentication account: ${authError.message}`,
          };
        }

        if (!authData.user) {
          return { error: "Failed to create authentication account." };
        }

        // Create the User row in Prisma (no email, has access code)
        const newUser = await prisma.user.create({
          data: {
            email: null, // No email for this patient
            name,
            birthday: birthdayDate,
            age,
            authId: authData.user.id,
            role: "PATIENT",
            mustChangePassword: true,
            isOnboarded: false,
            emailVerified: true, // N/A for no-email patients, set to true to bypass verification
            patientAccessCode: accessCode,
          },
        });

        // Revalidate the users page
        revalidatePath("/users");

        return {
          success: {
            type: "accessCode" as const,
            accessCode,
            temporaryPassword,
            userId: newUser.id,
            message:
              "Share the access code and temporary password with the patient. They will use these to log in.",
          },
        };
      }
    } catch (error) {
      console.error("Error creating patient account:", error);
      return {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while creating the patient account.",
      };
    }
  });
