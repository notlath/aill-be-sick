"use server";

import prisma from "@/prisma/prisma";
import { getCurrentDbUser } from "@/utils/user";
import { actionClient } from "./client";
import { revalidatePath } from "next/cache";
import * as z from "zod";

const RevertDiagnosisSchema = z.object({
  diagnosisId: z.number(),
});

export const revertDiagnosis = actionClient
  .inputSchema(RevertDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { diagnosisId } = parsedInput;
    const { success: dbUser, error: userError } = await getCurrentDbUser();

    if (!dbUser) {
      console.error(`Error fetching user: ${userError}`);
      return { error: `Error fetching user: ${userError}` };
    }

    if (!["CLINICIAN", "ADMIN", "DEVELOPER"].includes(dbUser.role)) {
      return { error: "Only clinicians can revert diagnoses" };
    }

    try {
      const diagnosis = await prisma.diagnosis.findUnique({
        where: { id: diagnosisId },
      });

      if (!diagnosis) {
        return { error: "Diagnosis not found" };
      }

      const diagnosisData = diagnosis as any;
      if (diagnosisData.status !== "REJECTED") {
        return { error: "Only rejected diagnoses can be reverted" };
      }

      const targetStatus = diagnosisData.originalStatus || "PENDING";

      const updatedDiagnosis = await prisma.diagnosis.update({
        where: { id: diagnosisId },
        data: {
          status: targetStatus,
          rejectedAt: null,
          rejectedBy: null,
        } as any,
      });

      revalidatePath("/healthcare-reports");
      revalidatePath("/pending-diagnoses");
      revalidatePath(`/diagnosis/${updatedDiagnosis.chatId}`);

      return {
        success: "Diagnosis reverted successfully",
        diagnosis: updatedDiagnosis,
      };
    } catch (error) {
      console.error(`Error reverting diagnosis ${diagnosisId}:`, error);
      return { error: `Error reverting diagnosis: ${error}` };
    }
  });

const BatchRevertDiagnosisSchema = z.object({
  diagnosisIds: z.array(z.number()).min(1),
});

export const batchRevertDiagnoses = actionClient
  .inputSchema(BatchRevertDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { diagnosisIds } = parsedInput;
    const { success: dbUser, error: userError } = await getCurrentDbUser();

    if (!dbUser) {
      console.error(`Error fetching user: ${userError}`);
      return { error: `Error fetching user: ${userError}` };
    }

    if (!["CLINICIAN", "ADMIN", "DEVELOPER"].includes(dbUser.role)) {
      return { error: "Only clinicians can revert diagnoses" };
    }

    try {
      const diagnoses = await prisma.diagnosis.findMany({
        where: {
          id: { in: diagnosisIds },
          status: "REJECTED",
        } as any,
        select: { id: true, originalStatus: true, chatId: true },
      });

      const updates = diagnoses.map((d) => {
        const diagnosisData = d as any;
        return prisma.diagnosis.update({
          where: { id: d.id },
          data: {
            status: diagnosisData.originalStatus || "PENDING",
            rejectedAt: null,
            rejectedBy: null,
          } as any,
        });
      });

      if (updates.length === 0) {
        return { error: "No rejected diagnoses found to revert" };
      }

      const results = await prisma.$transaction(updates);

      revalidatePath("/healthcare-reports");
      revalidatePath("/pending-diagnoses");

      return {
        success: `${results.length} diagnoses reverted successfully`,
        count: results.length,
      };
    } catch (error) {
      console.error(`Error batch reverting diagnoses:`, error);
      return { error: `Error batch reverting diagnoses: ${error}` };
    }
  });
