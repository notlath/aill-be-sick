"use server";

import { actionClient } from "./client";
import prisma from "@/prisma/prisma";
import { revalidatePath } from "next/cache";
import { getAuthUser, getDbUserByAuthId } from "@/utils/user";
import { hasActiveDeletionSchedule } from "@/utils/check-deletion-schedule";

import { OnboardingSchema } from "@/schemas/OnboardingSchema";

export const completeOnboarding = actionClient
  .inputSchema(OnboardingSchema)
  .action(async ({ parsedInput }) => {
    const authUser = await getAuthUser();

    if (!authUser) {
      return { error: "Not authenticated" };
    }

    const dbUser = await getDbUserByAuthId(authUser.id);
    if (dbUser?.role === "PATIENT") {
      const hasSchedule = await hasActiveDeletionSchedule(dbUser.id);
      if (hasSchedule) {
        return { error: "Your account is scheduled for deletion. Please keep your account or exit to continue using the app." };
      }
    }

    try {
      const {
        birthday,
        gender,
        address,
        region,
        province,
        district,
        city,
        barangay,
        latitude,
        longitude,
      } = parsedInput;

      const updatedUser = await prisma.user.update({
        where: { authId: authUser.id },
        data: {
          birthday: new Date(birthday),
          gender,
          address,
          region,
          province,
          district: district || null,
          city,
          barangay,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          isOnboarded: true,
        },
      });

      revalidatePath("/", "layout");
      return { success: { role: updatedUser.role } };
    } catch (error) {
      console.error("[completeOnboarding] Error updating user:", error);
      return { error: "Failed to complete onboarding. Please try again." };
    }
  });
