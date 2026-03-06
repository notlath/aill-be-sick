"use server";

import prisma from "@/prisma/prisma";

export const getMessagesByChatId = async (
  chatId: string,
  include?: { tempDiagnosis?: boolean; explanation?: boolean },
) => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        chatId,
      },
      include: {
        tempDiagnosis: include?.tempDiagnosis,
        explanation: include?.explanation,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return { success: messages };
  } catch (error) {
    console.error(`Error fetching messages for chatId ${chatId}:`, error);

    return { error: `Failed to fetch messages for chatId ${chatId}: ${error}` };
  }
};

/**
 * Fetch messages with their explanations by chatId.
 * This is a more direct way to get explanations linked to messages.
 */
export const getMessagesWithExplanationsByChatId = async (chatId: string) => {
  try {
    const messages = await prisma.message.findMany({
      where: { chatId },
      include: {
        explanation: true,
        tempDiagnosis: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return { success: messages };
  } catch (error) {
    console.error(
      `Error fetching messages with explanations for chatId ${chatId}:`,
      error
    );

    return {
      error: `Failed to fetch messages with explanations for chatId ${chatId}: ${error}`,
    };
  }
};
