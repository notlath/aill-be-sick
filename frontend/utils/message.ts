"use server";

import prisma from "@/prisma/prisma";
import { cacheLife, cacheTag } from "next/cache";

export const getMessagesByChatId = async (
  chatId: string,
  include?: { tempDiagnosis?: boolean; explanation?: boolean }
) => {
  "use cache";
  cacheLife("hours");
  cacheTag("messages", `messages-${chatId}`);

  try {
    const messages = await prisma.message.findMany({
      where: {
        chatId,
      },
      include: {
        tempDiagnosis: include?.tempDiagnosis,
        explanation: include?.explanation,
      },
    });

    return { success: messages };
  } catch (error) {
    console.error(`Error fetching messages for chatId ${chatId}:`, error);

    return { error: `Failed to fetch messages for chatId ${chatId}: ${error}` };
  }
};
