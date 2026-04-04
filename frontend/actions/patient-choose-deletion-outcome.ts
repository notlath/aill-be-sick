"use server";

import { actionClient } from "./client";
import { PatientDeletionOutcomeSchema } from "@/schemas/PatientDeletionOutcomeSchema";
import { getCurrentDbUser } from "@/utils/user";
import { revalidatePath } from "next/cache";
import prisma from "@/prisma/prisma";

export const patientChooseDeletionOutcome = actionClient
  .inputSchema(PatientDeletionOutcomeSchema)
  .action(async ({ parsedInput }) => {
    const { action } = parsedInput;

    const { success: dbUser, error: userError } = await getCurrentDbUser();

    if (userError || !dbUser) {
      return { error: "Authentication required", outcome: null };
    }

    if (dbUser.role !== "PATIENT") {
      return { error: "Only patients can choose their deletion outcome", outcome: null };
    }

    try {
      if (action === "restore") {
        const schedule = await prisma.deletionSchedule.findFirst({
          where: { userId: dbUser.id, status: "SCHEDULED" },
        });

        if (!schedule) {
          return { error: "No active deletion schedule found", outcome: null };
        }

        await prisma.deletionSchedule.update({
          where: { id: schedule.id },
          data: {
            status: "RESTORED",
            restoredAt: new Date(),
            restoredBy: dbUser.id,
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: dbUser.id,
            action: "RESTORE_DELETION",
            details: { patientId: dbUser.id, restoredBy: "self" },
          },
        });

        revalidatePath("/");
        revalidatePath("/diagnosis");
        revalidatePath("/history");

        return { success: true, outcome: "restored" as const };
      }

      return { error: "Invalid action", outcome: null };
    } catch (error) {
      console.error(`Error processing deletion outcome: ${error}`);
      return { error: "Failed to process your request. Please try again.", outcome: null };
    }
  });
