"use server";

import { actionClient } from "./client";
import { CreatePatientSchema } from "@/schemas/CreatePatientSchema";
import prisma from "@/prisma/prisma";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/utils/user";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { canCreatePatient } from "@/utils/role-hierarchy";
import { calculateAge } from "@/utils/lib";

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
        guardianName,
        guardianEmail,
        guardianPhone,
        guardianRelation,
        guardianConsent,
      } = parsedInput;

      // Validate gender
      const validGenders = ["MALE", "FEMALE", "OTHER"];
      if (!validGenders.includes(gender)) {
        return { error: "Please select a valid gender" };
      }

      console.log("[createPatient] Starting patient creation with input:", {
        firstName,
        lastName,
        email,
        birthday,
        gender,
        hasGuardianData: !!guardianName,
      });

      // Calculate age and validate guardian requirements
      const age = calculateAge(birthday);
      const isMinor = age < 18;

      console.log("[createPatient] Age calculation:", { birthday, age, isMinor });

      if (isMinor) {
        console.log("[createPatient] Minor detected, validating guardian data:", {
          guardianName: !!guardianName,
          guardianEmail: !!guardianEmail,
          guardianRelation: !!guardianRelation,
          guardianConsent,
        });

        if (!guardianName || !guardianEmail || !guardianRelation) {
          return {
            error: "Guardian information is required for patients under 18 years old. Please provide guardian name, email, and relationship.",
          };
        }
        if (!guardianConsent) {
          return {
            error: "Guardian consent is required for patients under 18 years old. Please confirm that the guardian has provided permission.",
          };
        }
      }

      // Build full name from structured fields
      const nameParts = [firstName, middleName, lastName, suffix].filter(
        Boolean,
      );
      const name = nameParts.join(" ");
      console.log("[createPatient] Built name:", name);

      // Check if email already exists
      console.log("[createPatient] Checking for existing user with email:", email);
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        console.log("[createPatient] Existing user found:", existingUser.id);
        return { error: "A user with this email already exists" };
      }
      console.log("[createPatient] No existing user found");

      const supabaseAdmin = createAdminClient();
      console.log("[createPatient] Created Supabase admin client");

      // Check if email already exists in Supabase Auth
      console.log("[createPatient] Checking existing users in Supabase Auth");
      const { data: existingUsers, error: listError } =
        await supabaseAdmin.auth.admin.listUsers();

      if (listError) {
        console.error("[createPatient] Error listing users:", listError);
        return { error: `Failed to check existing users: ${listError.message}` };
      }

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
      console.log("[createPatient] Supabase auth check completed");

      // Send automated invite email using inviteUserByEmail
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      console.log("[createPatient] NEXT_PUBLIC_SITE_URL:", process.env.NEXT_PUBLIC_SITE_URL);
      console.log("[createPatient] Using origin:", origin);
      console.log("[createPatient] Sending invite to:", email, "with origin:", origin);

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
        console.error("[createPatient] Invite error details:", JSON.stringify(inviteError, null, 2));
        return {
          error: `Failed to send invite email: ${inviteError.message}`,
        };
      }

      if (!inviteData?.user) {
        console.error("[createPatient] No user returned from invite:", inviteData);
        return { error: "Failed to create invite" };
      }

      console.log(`[createPatient] Invite sent successfully to ${email}, user ID: ${inviteData.user.id}`);

      const userId = inviteData.user.id;

      // Register patient profile in database
      // Note: latitude and longitude are geocoded from the patient's residential address
      // entered by the clinician. These coordinates represent the patient's home location,
      // NOT the healthcare facility where the clinician is located. This is critical for
      // accurate disease surveillance, clustering analysis, and outbreak detection.
      console.log("[createPatient] Creating patient in database with data:", {
        email,
        name,
        authId: userId,
        birthday: new Date(birthday),
        isMinor,
        hasGuardianData: isMinor ? !!guardianName : false,
      });

      const patient = await prisma.user.create({
        data: {
          email,
          name,
          authId: userId,
          role: "PATIENT",
          approvalStatus: "ACTIVE",
          birthday: new Date(birthday),
          age,
          gender: gender as "MALE" | "FEMALE" | "OTHER",
          address,
          district,
          city,
          barangay,
          region,
          province,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          isOnboarded: true,
          guardianName: isMinor ? guardianName : null,
          guardianEmail: isMinor ? guardianEmail : null,
          guardianPhone: isMinor ? guardianPhone : null,
          guardianRelation: isMinor ? guardianRelation : null,
        },
      });

      console.log("[createPatient] Patient created successfully with ID:", patient.id);

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
      console.error("[createPatient] Error details:", JSON.stringify(error, null, 2));
      console.error("[createPatient] Error stack:", error instanceof Error ? error.stack : "No stack trace");

      // Return user-friendly error message
      return { error: "Failed to register patient account. Please try again." };
    }
  });
