"use server";

import { actionClient } from "./client";
import { CreatePatientSchema } from "@/schemas/CreatePatientSchema";
import prisma from "@/prisma/prisma";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/utils/user";
import { createAdminClient } from "@/utils/supabase/admin";
import { canCreatePatient } from "@/utils/role-hierarchy";

export const createPatient = actionClient
  .inputSchema(CreatePatientSchema)
  .action(async ({ parsedInput }) => {
    const authUser = await getAuthUser();

    if (!authUser) {
      return { error: "Not authenticated" };
    }

    // Verify the current user has permission to create patients
    const currentUser = await prisma.user.findUnique({
      where: { authId: authUser.id },
      select: { role: true, approvalStatus: true },
    });

    // Check role hierarchy - CLINICIAN, ADMIN, and DEVELOPER can create patients
    if (!currentUser) {
      return { error: "User not found" };
    }
    if (!canCreatePatient(currentUser.role)) {
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

      // Create Supabase auth account using admin client
      // IMPORTANT: Use admin.inviteUserByEmail() instead of createUser() to:
      // 1. Send an invite email to the patient
      // 2. Let the patient set their own password
      // 3. Verify the patient's email address
      // 4. Avoid temp password sharing complications
      const supabaseAdmin = createAdminClient();

      // Check if email already exists in Supabase Auth
      // This can happen if the user was deleted from Prisma but not from Supabase Auth
      const { data: existingUsers } =
        await supabaseAdmin.auth.admin.listUsers();
      const existingSupabaseUser = existingUsers?.users?.find(
        (u) => u.email === email,
      );

      if (existingSupabaseUser) {
        console.log(
          `[createPatient] Email ${email} already exists in Supabase Auth (ID: ${existingSupabaseUser.id}). Deleting existing user before creating new one.`,
        );
        // Delete the existing Supabase Auth user
        const { error: deleteError } =
          await supabaseAdmin.auth.admin.deleteUser(existingSupabaseUser.id);

        if (deleteError) {
          console.error(
            `[createPatient] Failed to delete existing Supabase user:`,
            deleteError,
          );
          return {
            error: `Failed to clean up existing auth account: ${deleteError.message}`,
          };
        }
      }

      // Get the origin URL for the invite redirect
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

      const { data: userData, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${origin}/auth/callback?next=/patient/set-password`,
          data: {
            name,
            role: "PATIENT",
          },
        });

      if (inviteError) {
        console.error(
          `[createPatient] Supabase inviteUserByEmail error:`,
          inviteError,
        );
        return {
          error: `Failed to send invite email: ${inviteError.message}`,
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
          message: `Patient account created successfully. An invite email has been sent to ${email}. The patient must click the link in the email to set their password and access the system.`,
        },
      };
    } catch (error) {
      console.error("[createPatient] Error creating patient:", error);
      return { error: "Failed to create patient account. Please try again." };
    }
  });
