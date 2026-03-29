"use server";

import { actionClient } from "./client";
import { RegenerateCredentialsSchema } from "@/schemas/RegenerateCredentialsSchema";
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
 * Regenerate credentials for a patient account.
 * 
 * For patients with email:
 * - Generates new temporary password
 * - Sets mustChangePassword: true
 * - Resends verification email if not verified
 * 
 * For patients with access code:
 * - Generates new temporary password
 * - Optionally generates new access code
 * - Sets mustChangePassword: true
 */
export const regeneratePatientCredentials = actionClient
  .inputSchema(RegenerateCredentialsSchema)
  .action(async ({ parsedInput }) => {
    const { patientId } = parsedInput;

    // Auth guard: verify the caller is a CLINICIAN or DEVELOPER
    const { success: dbUser, error: userError } = await getCurrentDbUser();

    if (userError || !dbUser) {
      return { error: "You must be logged in to perform this action." };
    }

    if (dbUser.role !== "CLINICIAN" && dbUser.role !== "DEVELOPER") {
      return { error: "Only clinicians can reset patient credentials." };
    }

    try {
      // Find the patient
      const patient = await prisma.user.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          email: true,
          name: true,
          authId: true,
          role: true,
          patientAccessCode: true,
          emailVerified: true,
        },
      });

      if (!patient) {
        return { error: "Patient not found." };
      }

      if (patient.role !== "PATIENT") {
        return { error: "Credentials can only be reset for patient accounts." };
      }

      if (!patient.authId) {
        return { error: "Patient account has no authentication record." };
      }

      // Generate new temporary password
      const temporaryPassword = generateTemporaryPassword();

      // Update password in Supabase
      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(patient.authId, {
          password: temporaryPassword,
        });

      if (updateError) {
        console.error("Supabase password update error:", updateError);
        return { error: `Failed to reset password: ${updateError.message}` };
      }

      // Determine if this is an access code user or email user
      const isAccessCodeUser = !!patient.patientAccessCode;
      const hasRealEmail =
        patient.email && !patient.email.endsWith("@internal.ailbesick.local");

      // For access code users, generate a new access code
      let newAccessCode: string | null = null;
      if (isAccessCodeUser) {
        newAccessCode = generatePatientAccessCode();
        let attempts = 0;
        const maxAttempts = 10;

        // Ensure access code is unique
        while (attempts < maxAttempts) {
          const existingCode = await prisma.user.findUnique({
            where: { patientAccessCode: newAccessCode },
          });
          if (!existingCode) break;
          newAccessCode = generatePatientAccessCode();
          attempts++;
        }

        if (attempts >= maxAttempts) {
          return {
            error:
              "Failed to generate unique access code. Please try again.",
          };
        }
      }

      // Update Prisma user record
      const updateData: {
        mustChangePassword: boolean;
        patientAccessCode?: string;
      } = {
        mustChangePassword: true,
      };

      if (newAccessCode) {
        updateData.patientAccessCode = newAccessCode;
      }

      await prisma.user.update({
        where: { id: patientId },
        data: updateData,
      });

      // For email users who haven't verified, resend verification email
      if (hasRealEmail && !patient.emailVerified) {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL ??
          process.env.NEXT_PUBLIC_VERCEL_URL ??
          "http://localhost:3000";

        await supabaseAdmin.auth.admin.inviteUserByEmail(patient.email!, {
          redirectTo: `${appUrl}/auth/confirm`,
        });
      }

      // Revalidate the users page
      revalidatePath("/users");

      // Return appropriate response based on user type
      if (isAccessCodeUser) {
        return {
          success: {
            type: "accessCode" as const,
            accessCode: newAccessCode!,
            temporaryPassword,
            patientName: patient.name || "Patient",
            message:
              "New access code and password generated. Share these with the patient.",
          },
        };
      } else {
        return {
          success: {
            type: "email" as const,
            email: patient.email!,
            temporaryPassword,
            patientName: patient.name || "Patient",
            emailVerified: patient.emailVerified,
            message: patient.emailVerified
              ? "New temporary password generated. Share this with the patient."
              : "New temporary password generated and verification email resent.",
          },
        };
      }
    } catch (error) {
      console.error("Error regenerating credentials:", error);
      return {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while resetting credentials.",
      };
    }
  });
