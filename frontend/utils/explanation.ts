"use server";

import prisma from "@/prisma/prisma";
import { cacheLife, cacheTag } from "next/cache";

export const getExplanationByDiagnosisId = async (diagnosisId: number) => {
  "use cache";
  cacheLife("hours");
  cacheTag("explanation", `explanation-${diagnosisId}`);

  try {
    const explanation = await prisma.explanation.findUnique({
      where: { diagnosisId },
    });

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
