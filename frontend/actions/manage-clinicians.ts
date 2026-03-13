"use server";

import { actionClient } from "./client";
import { ManageClinicianEmailSchema } from "@/schemas/ManageClinicianEmailSchema";
import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/utils/user";
import prisma from "@/prisma/prisma";

export const addAllowedClinicianEmail = actionClient
  .inputSchema(ManageClinicianEmailSchema)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    const { success: dbUser, error, code } = await getCurrentDbUser();

    if (error || !dbUser) {
      return { error: "Unauthorized" };
    }

    if (dbUser.role !== "ADMIN" && dbUser.role !== ("DEVELOPER" as any)) {
      return { error: "Unauthorized. Admin access required." };
    }

    try {
      
      const existingEmail = await prisma.allowedClinicianEmail.findUnique({
        where: { email },
      });

      if (existingEmail) {
        return { error: "This email is already on the whitelist." };
      }

      const allowedEmail = await prisma.allowedClinicianEmail.create({
        data: {
          email,
        },
      });

      revalidatePath("/dashboard");

      return { success: allowedEmail };
    } catch (error) {
      console.error(`Error adding allowed clinician email: ${error}`);
      return { error: "Failed to add email to whitelist." };
    }
  });

export const removeAllowedClinicianEmail = actionClient
  .inputSchema(ManageClinicianEmailSchema)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    const { success: dbUser, error } = await getCurrentDbUser();

    if (error || !dbUser) {
      return { error: "Unauthorized" };
    }

    if (dbUser.role !== "ADMIN" && dbUser.role !== ("DEVELOPER" as any)) {
      return { error: "Unauthorized. Admin access required." };
    }

    try {
      await prisma.allowedClinicianEmail.delete({
        where: { email },
      });

      revalidatePath("/dashboard");

      return { success: true };
    } catch (error) {
      console.error(`Error removing allowed clinician email: ${error}`);
      return { error: "Failed to remove email from whitelist." };
    }
  });
