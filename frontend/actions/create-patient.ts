"use server";

import { actionClient } from "./client";
import { CreatePatientSchema } from "@/schemas/CreatePatientSchema";
import prisma from "@/prisma/prisma";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/utils/user";
import { createAdminClient } from "@/utils/supabase/admin";

export const createPatient = actionClient
  .inputSchema(CreatePatientSchema)
  .action(async ({ parsedInput }) => {
    const authUser = await getAuthUser();

    if (!authUser) {
      return { error: "Not authenticated" };
    }

    // Verify the current user is a clinician
    const currentUser = await prisma.user.findUnique({
      where: { authId: authUser.id },
      select: { role: true, approvalStatus: true },
    });

    // Define roles that can create patients (hierarchical: developer > admin > clinician > patient)
    const allowedRoles = ["CLINICIAN", "ADMIN", "DEVELOPER"];

    if (!currentUser || !allowedRoles.includes(currentUser.role)) {
      return { error: "Only clinicians can create patient accounts" };
    }

    // Only clinicians need ACTIVE approval status; ADMIN and DEVELOPER bypass this check
    if (
      currentUser.role === "CLINICIAN" &&
      currentUser.approvalStatus !== "ACTIVE"
    ) {
      return { error: "Your clinician account is not active" };
    }

    try {
      const {
        firstName,
        middleName,
        lastName,
        suffix,
        email,
        birthday,
        gender,
        address,
        district,
        city,
        barangay,
        region,
        province,
        latitude,
        longitude,
      } = parsedInput;

      // Build full name from structured fields
      const nameParts = [firstName, middleName, lastName, suffix].filter(
        Boolean,
      );
      const name = nameParts.join(" ");

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return { error: "A user with this email already exists" };
      }

      // Generate a temporary password
      const tempPassword = generateTempPassword();

      // Create Supabase auth account using admin client
      // IMPORTANT: Use admin.createUser() instead of signUp() to prevent
      // auto-signing in the new user and replacing the clinician's session
      const supabaseAdmin = createAdminClient();
      const { data: userData, error: createUserError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true, // Auto-confirm email since clinician verified the address
          user_metadata: {
            name,
            role: "PATIENT",
          },
        });

      if (createUserError) {
        console.error(
          `[createPatient] Supabase createUser error:`,
          createUserError,
        );
        return {
          error: `Failed to create auth account: ${createUserError.message}`,
        };
      }

      if (!userData?.user) {
        return { error: "Failed to create auth account" };
      }

      // Create patient profile in database
      // Note: latitude and longitude are geocoded from the patient's residential address
      // entered by the clinician. These coordinates represent the patient's home location,
      // NOT the healthcare facility where the clinician is located. This is critical for
      // accurate disease surveillance, clustering analysis, and outbreak detection.
      const patient = await prisma.user.create({
        data: {
          email,
          name,
          authId: userData.user.id,
          role: "PATIENT",
          approvalStatus: "ACTIVE",
          birthday: new Date(birthday),
          gender,
          address,
          district,
          city,
          barangay,
          region,
          province,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          isOnboarded: true,
        },
      });

      revalidatePath("/users");

      return {
        success: {
          patientId: patient.id,
          email: patient.email,
          name: patient.name,
          tempPassword,
          message: `Patient account created successfully. Temporary password: ${tempPassword}`,
        },
      };
    } catch (error) {
      console.error("[createPatient] Error creating patient:", error);
      return { error: "Failed to create patient account. Please try again." };
    }
  });

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
