"use server";

import prisma from "@/prisma/prisma";
import { cacheLife, cacheTag } from "next/cache";

export const getExplanationByDiagnosisId = async (diagnosisId: number) => {
  "use cache";
  cacheLife("hours");
  cacheTag("explanation", `explanation-${diagnosisId}`);

  try {
    // Try fetching by diagnosisId first (new approach)
    let explanation = await prisma.explanation.findUnique({
      where: { diagnosisId },
    });

    // Fallback: If not found by diagnosisId, try fetching by messageId
    // This handles explanations created before Diagnosis record exists
    // (i.e., when only TempDiagnosis is present during active chat)
    if (!explanation) {
      const diagnosis = await prisma.diagnosis.findUnique({
        where: { id: diagnosisId },
        include: { chat: { include: { messages: { include: { explanation: true } } } } },
      });

      // Find the first message that has an explanation
      const messageWithExplanation = diagnosis?.chat?.messages?.find(
        (m) => m.explanation
      );

      if (messageWithExplanation?.explanation) {
        explanation = messageWithExplanation.explanation;
      }
    }

    return { success: explanation };
  } catch (error) {
    console.error(
      `Error fetching explanation for diagnosisId ${diagnosisId}:`,
      error
    );

    return {
      error: `Could not fetch explanation for diagnosisId ${diagnosisId}`,
    };
  }
};

/**
 * Fetch explanation by chatId - useful for active chats where Diagnosis
 * record may not exist yet (only TempDiagnosis).
 * This queries explanations linked to DIAGNOSIS-type messages in the chat.
 */
export const getExplanationByChatId = async (chatId: string) => {
  "use cache";
  cacheLife("hours");
  cacheTag("explanation", `explanation-chat-${chatId}`);

  try {
    // Find the DIAGNOSIS message in this chat and get its explanation
    const diagnosisMessage = await prisma.message.findFirst({
      where: {
        chatId,
        type: "DIAGNOSIS",
      },
      include: {
        explanation: true,
      },
    });

    return { success: diagnosisMessage?.explanation ?? null };
  } catch (error) {
    console.error(
      `Error fetching explanation for chatId ${chatId}:`,
      error
    );

    return {
      error: `Could not fetch explanation for chatId ${chatId}`,
    };
  }
};
