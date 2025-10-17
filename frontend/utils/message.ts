"use server";

import prisma from "@/prisma/prisma";

export const getMessagesByChatId = async (chatId: string) => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        chatId,
      },
    });

    return { success: messages };
  } catch (error) {
    console.error(`Error fetching messages for chatId ${chatId}:`, error);

    return { error: `Failed to fetch messages for chatId ${chatId}: ${error}` };
  }
};
