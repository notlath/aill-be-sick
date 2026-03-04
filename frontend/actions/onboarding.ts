"use server";

import { actionClient } from "./client";
import prisma from "@/prisma/prisma";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/utils/user";

import { OnboardingSchema } from "@/schemas/OnboardingSchema";

export const completeOnboarding = actionClient
  .inputSchema(OnboardingSchema)
  .action(async ({ parsedInput }) => {
    const authUser = await getAuthUser();

    if (!authUser) {
      return { error: "Not authenticated" };
    }

    try {
      const { birthday, gender, region, province, district, city, barangay } =
        parsedInput;

      const updatedUser = await prisma.user.update({
        where: { authId: authUser.id },
        data: {
          birthday: new Date(birthday),
          gender,
          region,
          province,
          ...(district && { district }),
          city,
          barangay,
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
