"use server";

import prisma from "@/prisma/prisma";
import { OverrideDiagnosisSchema } from "@/schemas/OverrideDiagnosisSchema";
import { getCurrentDbUser } from "@/utils/user";
import { revalidatePath, revalidateTag } from "next/cache";
import { actionClient } from "./client";
import { canOverrideDiagnosis } from "@/utils/role-hierarchy";

export const overrideDiagnosis = actionClient
  .inputSchema(OverrideDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { diagnosisId, clinicianDisease, clinicianNotes } = parsedInput;

    // 1. Authenticate and authorize the clinician
    const { success: dbUser, error: authError } = await getCurrentDbUser();

    if (!dbUser) {
      console.error(`Authentication error: ${authError}`);
      return { error: "You must be logged in to perform this action." };
    }

    // Only CLINICIAN, ADMIN, or DEVELOPER roles can override diagnoses
    if (!canOverrideDiagnosis(dbUser.role)) {
      console.error(
        `Unauthorized override attempt by user ${dbUser.id} with role ${dbUser.role}`,
      );
      return {
        error:
          "You do not have permission to override diagnoses. Only clinicians can perform this action.",
      };
    }

    try {
      // 2. Verify the diagnosis exists and get original AI assessment
      const diagnosis = await prisma.diagnosis.findUnique({
        where: { id: diagnosisId },
        include: { override: true, user: true },
      });

      if (!diagnosis) {
        return { error: "The specified assessment record was not found." };
      }

      // 3. Check the current status to determine if auto-verification is needed
      const diagnosisData = diagnosis as any;
      const needsAutoVerify = ["PENDING", "INCONCLUSIVE"].includes(diagnosisData.status);
      const isAlreadyVerified = diagnosisData.status === "VERIFIED";

      // 4. Use a transaction to ensure atomicity: override + auto-verify (if pending/inconclusive)
      await prisma.$transaction(async (tx) => {
        // 4a. Create or update the override
        if (diagnosis.override) {
          // Update the existing override
          await tx.diagnosisOverride.update({
            where: { diagnosisId },
            data: {
              clinicianDisease,
              clinicianNotes: clinicianNotes ?? null,
              clinicianId: dbUser.id,
              // Keep original AI values, just update clinician's override
            },
          });

          console.log(
            `Updated override for diagnosis ${diagnosisId} by clinician ${dbUser.id}`,
          );
        } else {
          // Create a new override, preserving the original AI assessment
          await tx.diagnosisOverride.create({
            data: {
              diagnosisId,
              // Preserve original AI assessment for audit trail
              aiDisease: diagnosis.disease,
              aiConfidence: diagnosis.confidence,
              aiUncertainty: diagnosis.uncertainty,
              // Clinician's override
              clinicianDisease,
              clinicianNotes: clinicianNotes ?? null,
              clinicianId: dbUser.id,
            },
          });

          console.log(
            `Created override for diagnosis ${diagnosisId} by clinician ${dbUser.id}: AI suggested ${diagnosis.disease}, clinician overrode to ${clinicianDisease}`,
          );
        }

        // 4b. Auto-verify if the diagnosis is PENDING or INCONCLUSIVE
        if (needsAutoVerify) {
          await tx.diagnosis.update({
            where: { id: diagnosisId },
            data: {
              status: "VERIFIED",
              verifiedAt: new Date(),
              verifiedBy: dbUser.id,
            },
          });

          console.log(
            `Auto-verified diagnosis ${diagnosisId} as part of clinical override by clinician ${dbUser.id}`,
          );
        }
      });

      // 5. Revalidate relevant paths
      revalidateTag("diagnosis", { expire: 0 });
      revalidatePath("/healthcare-reports", "page");
      revalidatePath("/pending-diagnoses", "page");
      revalidatePath("/map", "page");
      revalidatePath("/dashboard", "page");

      // 6. Return appropriate success message
      if (isAlreadyVerified || needsAutoVerify) {
        const message = needsAutoVerify
          ? "Clinical override saved. This diagnosis has been automatically verified."
          : "Clinical override updated successfully.";
        return { success: message };
      }

      return {
        success: "Assessment successfully updated with your clinical override.",
      };
    } catch (error) {
      console.error(`Error overriding diagnosis: ${error}`);
      return {
        error:
          "An unexpected error occurred while saving your override. Please try again.",
      };
    }
  });
