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
