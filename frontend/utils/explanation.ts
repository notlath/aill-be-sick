"use server";

import prisma from "@/prisma/prisma";

export const getExplanationByDiagnosisId = async (diagnosisId: number) => {
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
