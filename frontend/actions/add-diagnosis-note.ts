"use server";

import { actionClient } from "./client";
import { AddDiagnosisNoteSchema } from "@/schemas/AddDiagnosisNoteSchema";
import prisma from "@/prisma/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/utils/user";

class ActionError extends Error {}

export const addDiagnosisNote = actionClient
  .inputSchema(AddDiagnosisNoteSchema)
  .action(async ({ parsedInput: { diagnosisId, content } }) => {
    const { success: user, error: userError } = await getCurrentDbUser();

    if (userError || !user) {
      throw new ActionError("Unauthorized");
    }

    if (!["CLINICIAN", "ADMIN", "DEVELOPER"].includes(user.role)) {
      throw new ActionError(
        "Permission denied: You cannot add a note to this diagnosis.",
      );
    }

    try {
      const diagnosis = await prisma.diagnosis.findUnique({
        where: { id: diagnosisId },
      });

      if (!diagnosis) {
        throw new ActionError("Diagnosis not found");
      }

      const note = await prisma.diagnosisNote.create({
        data: {
          diagnosisId,
          clinicianId: user.id,
          content: content.trim(),
        },
        include: {
          clinician: {
            select: { id: true, name: true },
          },
        },
      });

      revalidatePath("/healthcare-reports");

      return { note };
    } catch (error) {
      console.error(`Error adding note to diagnosis ${diagnosisId}:`, error);
      if (error instanceof ActionError) throw error;
      throw new ActionError("Failed to add diagnosis note");
    }
  });
