"use server";

import prisma from "@/prisma/prisma";
import { getCurrentDbUser } from "@/utils/user";
import { actionClient } from "./client";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { checkAndCreateAlert, checkAndCreateOutbreakAlert } from "@/utils/alert-pipeline";

/**
 * Schema for approving a diagnosis
 */
const ApproveDiagnosisSchema = z.object({
  diagnosisId: z.number(),
});

/**
 * Schema for rejecting a diagnosis
 */
const RejectDiagnosisSchema = z.object({
  diagnosisId: z.number(),
  reason: z.string().optional(),
});

/**
 * Approve a pending diagnosis - marks it as verified for clinician dashboard
 */
export const approveDiagnosis = actionClient
  .inputSchema(ApproveDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { diagnosisId } = parsedInput;
    const { success: dbUser, error: userError } = await getCurrentDbUser();

    if (!dbUser) {
      console.error(`Error fetching user: ${userError}`);
      return { error: `Error fetching user: ${userError}` };
    }

    // Verify the user has permission (CLINICIAN, ADMIN, or DEVELOPER)
    if (!["CLINICIAN", "ADMIN", "DEVELOPER"].includes(dbUser.role)) {
      return { error: "Only clinicians can approve diagnoses" };
    }

    try {
      // Check if diagnosis exists and is pending, including patient demographics
      const diagnosis = await prisma.diagnosis.findUnique({
        where: { id: diagnosisId },
        include: { user: true },
      });

      if (!diagnosis) {
        return { error: "Diagnosis not found" };
      }

      // Use type assertion for status check (Prisma types not regenerated yet)
      const diagnosisData = diagnosis as any;
      if (diagnosisData.status === "VERIFIED") {
        return { error: "Diagnosis is already verified" };
      }

      if (diagnosisData.status === "REJECTED") {
        return { error: "Cannot verify a rejected diagnosis" };
      }

      // Allow verifying both PENDING and INCONCLUSIVE diagnoses
      // INCONCLUSIVE: AI could not reach confident prediction, clinician confirms
      if (!["PENDING", "INCONCLUSIVE"].includes(diagnosisData.status)) {
        return { error: "Diagnosis cannot be verified in its current state" };
      }

      // Update diagnosis status to VERIFIED
      const updatedDiagnosis = await prisma.diagnosis.update({
        where: { id: diagnosisId },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
          verifiedBy: dbUser.id,
        } as any,
      });

      // Revalidate paths for diagnosis data
      revalidatePath("/healthcare-reports");
      revalidatePath("/pending-diagnoses");
      revalidatePath(`/diagnosis/${diagnosis.chatId}`);

      // Run anomaly and outbreak checks in the background — non-blocking.
      // Only verified diagnoses enter the surveillance pipeline.
      const patient = diagnosis.user;
      checkAndCreateAlert({
        diagnosisId,
        disease: diagnosis.disease,
        confidence: diagnosis.confidence,
        uncertainty: diagnosis.uncertainty,
        city: diagnosis.city,
        province: diagnosis.province,
        region: diagnosis.region,
        barangay: diagnosis.barangay,
        district: diagnosis.district,
        latitude: diagnosis.latitude ?? null,
        longitude: diagnosis.longitude ?? null,
        patientAge: patient?.age ?? undefined,
        patientGender: patient?.gender ?? undefined,
      }).catch((err) =>
        console.error(
          `[approveDiagnosis] Anomaly alert failed for diagnosis ${diagnosisId}:`,
          err,
        ),
      );

      checkAndCreateOutbreakAlert().catch((err) =>
        console.error(
          `[approveDiagnosis] Outbreak alert failed for diagnosis ${diagnosisId}:`,
          err,
        ),
      );

      return { 
        success: "Diagnosis verified successfully",
        diagnosis: updatedDiagnosis,
      };
    } catch (error) {
      console.error(`Error approving diagnosis ${diagnosisId}:`, error);
      return { error: `Error approving diagnosis: ${error}` };
    }
  });

/**
 * Reject a pending diagnosis - marks it as rejected
 */
export const rejectDiagnosis = actionClient
  .inputSchema(RejectDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { diagnosisId, reason } = parsedInput;
    const { success: dbUser, error: userError } = await getCurrentDbUser();

    if (!dbUser) {
      console.error(`Error fetching user: ${userError}`);
      return { error: `Error fetching user: ${userError}` };
    }

    // Verify the user has permission (CLINICIAN, ADMIN, or DEVELOPER)
    if (!["CLINICIAN", "ADMIN", "DEVELOPER"].includes(dbUser.role)) {
      return { error: "Only clinicians can reject diagnoses" };
    }

    try {
      // Check if diagnosis exists and is pending
      const diagnosis = await prisma.diagnosis.findUnique({
        where: { id: diagnosisId },
      });

      if (!diagnosis) {
        return { error: "Diagnosis not found" };
      }

      // Use type assertion for status check (Prisma types not regenerated yet)
      const diagnosisData = diagnosis as any;
      if (diagnosisData.status === "REJECTED") {
        return { error: "Diagnosis is already rejected" };
      }

      if (diagnosisData.status === "VERIFIED") {
        return { error: "Cannot reject a verified diagnosis" };
      }

      // Allow rejecting both PENDING and INCONCLUSIVE diagnoses
      if (!["PENDING", "INCONCLUSIVE"].includes(diagnosisData.status)) {
        return { error: "Diagnosis cannot be rejected in its current state" };
      }

      // Update diagnosis status to REJECTED
      const updatedDiagnosis = await prisma.diagnosis.update({
        where: { id: diagnosisId },
        data: {
          status: "REJECTED",
          originalStatus: diagnosisData.status,
          rejectedAt: new Date(),
          rejectedBy: dbUser.id,
        } as any,
      });

      // If a reason is provided, add a diagnosis note
      if (reason) {
        await prisma.diagnosisNote.create({
          data: {
            diagnosisId,
            clinicianId: dbUser.id,
            content: `Rejection reason: ${reason}`,
          },
        });
      }

      // Revalidate paths for diagnosis data
      revalidatePath("/healthcare-reports");
      revalidatePath("/pending-diagnoses");
      revalidatePath(`/diagnosis/${diagnosis.chatId}`);

      return { 
        success: "Diagnosis rejected successfully",
        diagnosis: updatedDiagnosis,
      };
    } catch (error) {
      console.error(`Error rejecting diagnosis ${diagnosisId}:`, error);
      return { error: `Error rejecting diagnosis: ${error}` };
    }
  });

/**
 * Batch approve multiple pending diagnoses
 */
const BatchApproveDiagnosisSchema = z.object({
  diagnosisIds: z.array(z.number()).min(1),
});

export const batchApproveDiagnoses = actionClient
  .inputSchema(BatchApproveDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { diagnosisIds } = parsedInput;
    const { success: dbUser, error: userError } = await getCurrentDbUser();

    if (!dbUser) {
      console.error(`Error fetching user: ${userError}`);
      return { error: `Error fetching user: ${userError}` };
    }

    // Verify the user has permission
    if (!["CLINICIAN", "ADMIN", "DEVELOPER"].includes(dbUser.role)) {
      return { error: "Only clinicians can approve diagnoses" };
    }

    try {
      const now = new Date();

      // Query diagnoses that are eligible for verification BEFORE updating,
      // so we only run the alert pipeline for diagnoses actually changed by this call.
      const eligibleDiagnoses = await prisma.diagnosis.findMany({
        where: {
          id: { in: diagnosisIds },
          status: { in: ["PENDING", "INCONCLUSIVE"] },
        },
        include: { user: true },
      });

      // Update all diagnoses to VERIFIED in a single transaction
      // Handles both PENDING and INCONCLUSIVE diagnoses
      const result = await prisma.diagnosis.updateMany({
        where: {
          id: { in: diagnosisIds },
          status: { in: ["PENDING", "INCONCLUSIVE"] },
        },
        data: {
          status: "VERIFIED",
          verifiedAt: now,
          verifiedBy: dbUser.id,
        } as any,
      });

      // Run anomaly and outbreak checks for each newly verified diagnosis — non-blocking.
      // Only verified diagnoses enter the surveillance pipeline.
      for (const dx of eligibleDiagnoses) {
        const patient = dx.user;
        checkAndCreateAlert({
          diagnosisId: dx.id,
          disease: dx.disease,
          confidence: dx.confidence,
          uncertainty: dx.uncertainty,
          city: dx.city,
          province: dx.province,
          region: dx.region,
          barangay: dx.barangay,
          district: dx.district,
          latitude: dx.latitude ?? null,
          longitude: dx.longitude ?? null,
          patientAge: patient?.age ?? undefined,
          patientGender: patient?.gender ?? undefined,
        }).catch((err) =>
          console.error(
            `[batchApproveDiagnoses] Anomaly alert failed for diagnosis ${dx.id}:`,
            err,
          ),
        );
      }

      // Run outbreak detection once for the full dataset — it scans all VERIFIED diagnoses globally.
      checkAndCreateOutbreakAlert().catch((err) =>
        console.error(
          `[batchApproveDiagnoses] Outbreak alert failed:`,
          err,
        ),
      );

      // Revalidate paths
      revalidatePath("/healthcare-reports");
      revalidatePath("/pending-diagnoses");

      return { 
        success: `${result.count} diagnoses verified successfully`,
        count: result.count,
      };
    } catch (error) {
      console.error(`Error batch approving diagnoses:`, error);
      return { error: `Error batch approving diagnoses: ${error}` };
    }
  });

/**
 * Batch reject multiple pending diagnoses
 */
const BatchRejectDiagnosisSchema = z.object({
  diagnosisIds: z.array(z.number()).min(1),
  reason: z.string().optional(),
});

export const batchRejectDiagnoses = actionClient
  .inputSchema(BatchRejectDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { diagnosisIds, reason } = parsedInput;
    const { success: dbUser, error: userError } = await getCurrentDbUser();

    if (!dbUser) {
      console.error(`Error fetching user: ${userError}`);
      return { error: `Error fetching user: ${userError}` };
    }

    // Verify the user has permission
    if (!["CLINICIAN", "ADMIN", "DEVELOPER"].includes(dbUser.role)) {
      return { error: "Only clinicians can reject diagnoses" };
    }

    try {
      const now = new Date();
      
      // Update all diagnoses to REJECTED, preserving original status
      // Split into two queries to set correct originalStatus for each
      const [pendingResult, inconclusiveResult] = await prisma.$transaction([
        prisma.diagnosis.updateMany({
          where: {
            id: { in: diagnosisIds },
            status: "PENDING",
          },
          data: {
            status: "REJECTED",
            originalStatus: "PENDING",
            rejectedAt: now,
            rejectedBy: dbUser.id,
          },
        }),
        prisma.diagnosis.updateMany({
          where: {
            id: { in: diagnosisIds },
            status: "INCONCLUSIVE",
          },
          data: {
            status: "REJECTED",
            originalStatus: "INCONCLUSIVE",
            rejectedAt: now,
            rejectedBy: dbUser.id,
          },
        }),
      ]);

      const totalRejected = pendingResult.count + inconclusiveResult.count;

      // If a reason is provided, add diagnosis notes for all rejected diagnoses
      if (reason) {
        await prisma.diagnosisNote.createMany({
          data: diagnosisIds.map((diagnosisId) => ({
            diagnosisId,
            clinicianId: dbUser.id,
            content: `Rejection reason: ${reason}`,
          })),
        });
      }

      // Revalidate paths
      revalidatePath("/healthcare-reports");
      revalidatePath("/pending-diagnoses");

      return { 
        success: `${totalRejected} diagnoses rejected successfully`,
        count: totalRejected,
      };
    } catch (error) {
      console.error(`Error batch rejecting diagnoses:`, error);
      return { error: `Error batch rejecting diagnoses: ${error}` };
    }
  });
