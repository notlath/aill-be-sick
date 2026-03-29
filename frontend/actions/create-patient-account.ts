"use server";

import { actionClient } from "./client";
import { CreatePatientAccountSchema } from "@/schemas/CreatePatientAccountSchema";
import prisma from "@/prisma/prisma";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { getCurrentDbUser } from "@/utils/user";
import { revalidatePath } from "next/cache";

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

export const createPatientAccount = actionClient
  .inputSchema(CreatePatientAccountSchema)
  .action(async ({ parsedInput }) => {
    const { name, email, birthday } = parsedInput;

    // Auth guard: verify the caller is a CLINICIAN or DEVELOPER
    const { success: dbUser, error: userError } = await getCurrentDbUser();

    if (userError || !dbUser) {
      return { error: "You must be logged in to perform this action." };
    }

    if (dbUser.role !== "CLINICIAN" && dbUser.role !== "DEVELOPER") {
      return { error: "Only clinicians can create patient accounts." };
    }

    try {
      // Check if user already exists in Prisma
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return { error: "A user with this email address already exists." };
      }

      // Generate temporary password
      const temporaryPassword = generateTemporaryPassword();

      // Create Supabase auth user with confirmed email (no verification email sent)
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: temporaryPassword,
          email_confirm: true,
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
        },
      });

      // Revalidate the users page
      revalidatePath("/users");

      return {
        success: {
          email: newUser.email,
          temporaryPassword,
          userId: newUser.id,
        },
      };
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
