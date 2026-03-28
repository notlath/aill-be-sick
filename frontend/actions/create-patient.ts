"use server";

import { actionClient } from "./client";
import { CreatePatientSchema } from "@/schemas/CreatePatientSchema";
import prisma from "@/prisma/prisma";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/utils/user";
import { createClient } from "@/utils/supabase/server";

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

    if (!currentUser || currentUser.role !== "CLINICIAN") {
      return { error: "Only clinicians can create patient accounts" };
    }

    if (currentUser.approvalStatus !== "ACTIVE") {
      return { error: "Your clinician account is not active" };
    }

    try {
      const {
        name,
        email,
        phone,
        birthday,
        gender,
        address,
        district,
        city,
        barangay,
        region,
        province,
        medicalId,
      } = parsedInput;

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return { error: "A user with this email already exists" };
      }

      // Generate a temporary password
      const tempPassword = generateTempPassword();

      // Create Supabase auth account
      const supabase = await createClient();
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: {
            name,
            role: "PATIENT",
          },
        },
      });

      if (signUpError) {
        console.error(`[createPatient] Supabase signup error:`, signUpError);
        return {
          error: `Failed to create auth account: ${signUpError.message}`,
        };
      }

      if (!data.user) {
        return { error: "Failed to create auth account" };
      }

      // Create patient profile in database
      const patient = await prisma.user.create({
        data: {
          email,
          name,
          authId: data.user.id,
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
