"use server";

import prisma from "@/prisma/prisma";

export const getDiagnosisByChatId = async (chatId: string) => {
  try {
    const diagnosis = await prisma.diagnosis.findUnique({
      where: { chatId },
    });

    return { success: diagnosis };
  } catch (error) {
    console.error(`Error fetching diagnosis for chatId ${chatId}:`, error);

    return { error: `Could not fetch diagnosis for chatId ${chatId}` };
  }
};

export const getAllDiagnoses = async ({ skip, take }: { skip?: number; take?: number }) => {
  try {
    if (skip || take) {
      const diagnoses = await prisma.diagnosis.findMany({
        skip,
        take,
      });

      return { success: diagnoses };
    }

    const diagnoses = await prisma.diagnosis.findMany();

    return { success: diagnoses };
  } catch (error) {
    console.error(`Error fetching all diagnoses:`, error);

    return { error: `Could not fetch all diagnoses` };
  }
};

export const getTotalDiagnosesCount = async () => {
  try {
    const count = await prisma.diagnosis.count();

    return { success: count };
  } catch (error) {
    console.error(`Error fetching total diagnoses count: ${error}`);

    return { error: `Error fetching total diagnoses count: ${error}` };
  }
};
