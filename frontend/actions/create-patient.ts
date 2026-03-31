"use server";

import { actionClient } from "./client";
import { CreatePatientSchema } from "@/schemas/CreatePatientSchema";
import prisma from "@/prisma/prisma";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/utils/user";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { canCreatePatient } from "@/utils/role-hierarchy";

export const createPatient = actionClient
  .inputSchema(CreatePatientSchema)
  .action(async ({ parsedInput }) => {
    const authUser = await getAuthUser();

    if (!authUser) {
      return { error: "Not authenticated" };
    }

    // Verify the current user has permission to register patients
    const currentUser = await prisma.user.findUnique({
      where: { authId: authUser.id },
      select: { role: true, approvalStatus: true },
    });

    // Check role hierarchy - CLINICIAN, ADMIN, and DEVELOPER can register patients
    if (!currentUser) {
      return { error: "User not found" };
    }
    if (!canCreatePatient(currentUser.role)) {
      return { error: "Only clinicians can register patient accounts" };
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

      const supabaseAdmin = createAdminClient();

      // Check if email already exists in Supabase Auth
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

      // Send automated invite email using inviteUserByEmail
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

      const { data: inviteData, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: {
            name,
            role: "PATIENT",
          },
          redirectTo: `${origin}/auth/callback?next=/patient/set-password`,
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

      if (!inviteData?.user) {
        return { error: "Failed to create invite" };
      }

      console.log(`[createPatient] Invite sent successfully to ${email}`);

      const userId = inviteData.user.id;

      // Register patient profile in database
      // Note: latitude and longitude are geocoded from the patient's residential address
      // entered by the clinician. These coordinates represent the patient's home location,
      // NOT the healthcare facility where the clinician is located. This is critical for
      // accurate disease surveillance, clustering analysis, and outbreak detection.
      const patient = await prisma.user.create({
        data: {
          email,
          name,
          authId: userId,
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
          message: `Patient account created successfully. An invite email has been sent to ${email}.`,
        },
      };
    } catch (error) {
      console.error("[createPatient] Error registering patient:", error);
      return { error: "Failed to register patient account. Please try again." };
    }
  });
