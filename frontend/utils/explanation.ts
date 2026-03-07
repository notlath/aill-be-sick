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
    // This handles legacy explanations that were only linked to messages
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
