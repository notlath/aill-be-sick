"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { Prisma } from "@/lib/generated/prisma";
import prisma from "@/prisma/prisma";
import { SaveClinicalVerificationSchema } from "@/schemas/SaveClinicalVerificationSchema";
import { getClinicalVerificationProtocol } from "@/constants/clinical-verification-protocols";
import { scoreClinicalVerification } from "@/utils/clinical-verification";
import { getCurrentDbUser } from "@/utils/user";
import { hasActiveDeletionSchedule } from "@/utils/check-deletion-schedule";
import { actionClient } from "./client";

export const saveClinicalVerification = actionClient
  .inputSchema(SaveClinicalVerificationSchema)
  .action(async ({ parsedInput }) => {
    const { chatId, disease, selectedSymptomIds } = parsedInput;

    const { success: dbUser, error } = await getCurrentDbUser();
    if (!dbUser) {
      console.error(`[saveClinicalVerification] Error fetching user: ${error}`);
      return { error: `Error fetching user: ${error}` };
    }

    if (dbUser.role === "PATIENT") {
      const hasSchedule = await hasActiveDeletionSchedule(dbUser.id);
      if (hasSchedule) {
        return {
          error:
            "Your account is scheduled for deletion. Please keep your account or exit to continue using the app.",
        };
      }
    }

    try {
      const chat = await prisma.chat.findFirst({
        where: {
          chatId,
          userId: dbUser.id,
        },
        select: {
          chatId: true,
          userId: true,
        },
      });

      if (!chat) {
        return { error: "Chat not found or unauthorized." };
      }

      const protocol = getClinicalVerificationProtocol(disease);
      if (!protocol) {
        return { error: "Unsupported disease protocol." };
      }

      const result = scoreClinicalVerification(protocol, selectedSymptomIds);
      const { status, ...clinicalVerificationPayload } = result;
      const serializedPayload =
        clinicalVerificationPayload as Prisma.InputJsonValue;

      const diagnosis = await prisma.diagnosis.findUnique({
        where: { chatId },
        select: {
          id: true,
          disease: true,
        },
      });

      if (diagnosis) {
        if (diagnosis.disease !== protocol.disease) {
          return {
            error:
              "The saved result no longer matches this clinical checklist. Please refresh and try again.",
          };
        }

        await prisma.diagnosis.update({
          where: { id: diagnosis.id },
          data: {
            clinicalVerification: serializedPayload,
            clinicalVerificationStatus: status,
          },
        });
      } else {
        const tempDiagnosis = await prisma.tempDiagnosis.findFirst({
          where: { chatId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            disease: true,
          },
        });

        if (!tempDiagnosis) {
          return { error: "No diagnosis result was found to verify." };
        }

        if (tempDiagnosis.disease !== protocol.disease) {
          return {
            error:
              "The saved result no longer matches this clinical checklist. Please refresh and try again.",
          };
        }

        await prisma.tempDiagnosis.update({
          where: { id: tempDiagnosis.id },
          data: {
            clinicalVerification: serializedPayload,
            clinicalVerificationStatus: status,
          },
        });
      }

      revalidateTag("diagnosis", { expire: 0 });
      revalidateTag(`diagnosis-${chatId}`, { expire: 0 });
      revalidateTag("chat", { expire: 0 });
      revalidateTag(`chat-${chatId}`, { expire: 0 });
      revalidateTag("chats", { expire: 0 });
      revalidateTag(`chats-${dbUser.id}`, { expire: 0 });
      revalidateTag(`messages-${chatId}`, { expire: 0 });
      revalidatePath(`/diagnosis/${chatId}`, "page");
      revalidatePath("/history", "page");

      return {
        status,
        matchedCount: result.matchedCount,
        minRequiredCount: result.minRequiredCount,
        coreMatchedCount: result.coreMatchedCount,
        contradictionCount: result.contradictionCount,
        selectedSymptomIds: result.selectedSymptomIds,
        matchedSymptomIds: result.matchedSymptomIds,
        contradictionSymptomIds: result.contradictionSymptomIds,
        missingCoreSymptomIds: result.missingCoreSymptomIds,
        minCoreCount: result.minCoreCount,
        protocolVersion: result.protocolVersion,
        submittedAt: result.submittedAt,
      };
    } catch (saveError) {
      console.error(
        `[saveClinicalVerification] Error saving clinical verification: ${saveError}`,
      );
      return {
        error: `Error saving clinical verification: ${saveError}`,
      };
    }
  });
