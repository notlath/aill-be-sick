"use server";

import prisma from "@/prisma/prisma";
import { DiscardDiagnosisSchema } from "@/schemas/DiscardDiagnosisSchema";
import { revalidatePath, revalidateTag } from "next/cache";
import { actionClient } from "./client";

/**
 * Discards a temporary diagnosis, allowing users to opt-out of having
 * their diagnosis recorded in the permanent system.
 *
 * This action:
 * 1. Deletes the TempDiagnosis record for the chat
 * 2. Deletes any associated Explanation records (orphaned explanations)
 * 3. Marks the chat as having no diagnosis (hasDiagnosis remains false)
 *
 * Use cases:
 * - User doesn't want their diagnosis stored
 * - User wants to start a fresh diagnosis session
 * - Low-confidence diagnosis that user doesn't trust
 */
export const discardDiagnosis = actionClient
  .inputSchema(DiscardDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { chatId } = parsedInput;

    try {
      // Check if chat already has a recorded diagnosis
      const chat = await prisma.chat.findUnique({
        where: { chatId },
        select: { hasDiagnosis: true },
      });

      if (chat?.hasDiagnosis) {
        console.warn(
          `[discardDiagnosis] Cannot discard - chat ${chatId} already has permanent diagnosis`,
        );
        return {
          error: "Cannot discard a recorded diagnosis. It has already been saved.",
        };
      }

      // Find temp diagnoses to delete
      const tempDiagnoses = await prisma.tempDiagnosis.findMany({
        where: { chatId },
      });

      const tempDiagnosisCount = tempDiagnoses.length;

      if (tempDiagnosisCount === 0) {
        console.warn(
          `[discardDiagnosis] No TempDiagnosis found for chat ${chatId}`,
        );
        return {
          success: "No pending diagnosis to discard.",
          discardedCount: 0,
        };
      }

      // Find and delete associated explanations (linked via messageId)
      const messageIds = tempDiagnoses.map((t) => t.messageId);
      const explanations = await prisma.explanation.findMany({
        where: { messageId: { in: messageIds } },
      });

      if (explanations.length > 0) {
        const explanationIds = explanations.map((e) => e.id);
        await prisma.explanation.deleteMany({
          where: { id: { in: explanationIds } },
        });

        console.log(
          `[discardDiagnosis] Deleted ${explanations.length} explanation(s) for chat ${chatId}`,
        );
      }

      // Delete temp diagnoses
      await prisma.tempDiagnosis.deleteMany({
        where: { chatId },
      });

      // Revalidate cache
      revalidateTag(`messages-${chatId}`, { expire: 0 });
      revalidateTag(`chat-${chatId}`, { expire: 0 });
      revalidatePath(`/diagnosis/${chatId}`, "page");

      console.log(
        `[discardDiagnosis] Discarded ${tempDiagnosisCount} temp diagnosis(es) for chat ${chatId}`,
      );

      return {
        success: "Diagnosis discarded successfully.",
        discardedCount: tempDiagnosisCount,
      };
    } catch (error) {
      console.error(`[discardDiagnosis] Error: ${error}`);
      return { error: `Error discarding diagnosis: ${error}` };
    }
  });
