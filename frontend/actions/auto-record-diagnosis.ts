"use server";

import prisma from "@/prisma/prisma";
import { AutoRecordDiagnosisSchema } from "@/schemas/AutoRecordDiagnosisSchema";
import { getCurrentDbUser } from "@/utils/user";
import { hasActiveDeletionSchedule } from "@/utils/check-deletion-schedule";
import { revalidatePath, revalidateTag } from "next/cache";
import { actionClient } from "./client";
import { DiagnosisStatus } from "@/lib/generated/prisma";

/**
 * Automatically promotes a TempDiagnosis to a permanent Diagnosis record once
 * a SHAP explanation has been generated. All diagnoses are auto-recorded
 * regardless of confidence or uncertainty levels, ensuring no diagnosis is
 * left in a limbo state.
 *
 * GPS coordinates are optional — profile-based location fields (city, province,
 * region, barangay, district) are always sourced from the authenticated user.
 *
 * Anomaly and outbreak alert checks are NOT triggered here. They run when a
 * clinician verifies the diagnosis (see verify-diagnosis.ts and override-diagnosis.ts),
 * ensuring only confirmed cases enter the surveillance pipeline.
 *
 * For inconclusive diagnoses (isInconclusive=true), the diagnosis is recorded
 * with status INCONCLUSIVE. These cases represent diagnoses where the AI model
 * could not reach a confident prediction.
 */

export const autoRecordDiagnosis = actionClient
  .inputSchema(AutoRecordDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { messageId, chatId, isInconclusive } = parsedInput;

    const { success: dbUser, error } = await getCurrentDbUser();
    if (!dbUser) {
      console.error(`[autoRecordDiagnosis] Error fetching user: ${error}`);
      return { error: `Error fetching user: ${error}` };
    }

    if (dbUser.role === "PATIENT") {
      const hasSchedule = await hasActiveDeletionSchedule(dbUser.id);
      if (hasSchedule) {
        return { error: "Your account is scheduled for deletion. Please keep your account or exit to continue using the app." };
      }
    }

    try {
      // Guard: if the chat already has a recorded diagnosis, skip silently.
      const chat = await prisma.chat.findUnique({
        where: { chatId },
        select: { hasDiagnosis: true },
      });
      if (chat?.hasDiagnosis) {
        return { success: "Diagnosis already recorded." };
      }

      // Look up the TempDiagnosis linked to this DIAGNOSIS message.
      const tempDiagnosis = await prisma.tempDiagnosis.findFirst({
        where: { chatId },
        orderBy: { id: "desc" },
      });

      if (!tempDiagnosis) {
        console.warn(
          `[autoRecordDiagnosis] No TempDiagnosis found for chat ${chatId}`,
        );
        return { error: "No pending diagnosis found to record." };
      }

      // Link the already-generated Explanation (if any) to the new Diagnosis.
      const explanation = await prisma.explanation.findUnique({
        where: { messageId },
      });

      const diagnosis = await prisma.diagnosis.create({
        data: {
          confidence: tempDiagnosis.confidence,
          uncertainty: tempDiagnosis.uncertainty,
          modelUsed: tempDiagnosis.modelUsed,
          disease: tempDiagnosis.disease,
          chatId,
          symptoms: tempDiagnosis.symptoms,
          cdss: (tempDiagnosis as any).cdss ?? undefined,
          isValid: tempDiagnosis.isValid,
          clinicalVerification:
            tempDiagnosis.clinicalVerification ?? undefined,
          clinicalVerificationStatus:
            tempDiagnosis.clinicalVerificationStatus ?? undefined,
          userId: dbUser.id,
          latitude: dbUser.latitude ?? null,
          longitude: dbUser.longitude ?? null,
          city: dbUser.city,
          province: dbUser.province,
          region: dbUser.region,
          barangay: dbUser.barangay,
          district: dbUser.district,
          // Inconclusive diagnoses get INCONCLUSIVE status; others remain PENDING
          status: isInconclusive
            ? DiagnosisStatus.INCONCLUSIVE
            : DiagnosisStatus.PENDING,
          ...(explanation
            ? { explanation: { connect: { id: explanation.id } } }
            : {}),
        },
      });

      await prisma.chat.update({
        where: { chatId },
        data: { hasDiagnosis: true },
      });

      await prisma.tempDiagnosis.deleteMany({ where: { chatId } });

      revalidateTag(`messages-${chatId}`, { expire: 0 });
      revalidateTag("diagnosis", { expire: 0 });
      revalidateTag(`diagnosis-${chatId}`, { expire: 0 });
      revalidateTag("chat", { expire: 0 });
      revalidateTag(`chat-${chatId}`, { expire: 0 });
      revalidatePath(`/diagnosis/${chatId}`, "page");
      revalidatePath("/history", "page");

      console.log(
        `[autoRecordDiagnosis] Recorded diagnosis ${diagnosis.id} for chat ${chatId}${isInconclusive ? " (inconclusive)" : ""}`,
      );

      return {
        success: isInconclusive
          ? "Inconclusive diagnosis recorded."
          : "Diagnosis automatically recorded.",
      };
    } catch (error) {
      console.error(`[autoRecordDiagnosis] Error: ${error}`);
      return { error: `Error auto-recording diagnosis: ${error}` };
    }
  });
