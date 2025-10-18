"use server";

import prisma from "@/prisma/prisma";

export const getMessagesByChatId = async (
  chatId: string,
  include?: { tempDiagnosis?: boolean }
) => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        chatId,
      },
      include: {
        tempDiagnosis: include?.tempDiagnosis,
      },
    });

    return { success: messages };
  } catch (error) {
    console.error(`Error fetching messages for chatId ${chatId}:`, error);

    return { error: `Failed to fetch messages for chatId ${chatId}: ${error}` };
  }
};
