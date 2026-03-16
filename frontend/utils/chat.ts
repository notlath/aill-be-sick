"use server";

import prisma from "@/prisma/prisma";
import { cacheLife, cacheTag } from "next/cache";

export const getChats = async (userId: number, include?: { messages?: boolean | object; diagnosis?: boolean; tempDiagnoses?: boolean | object }) => {
  "use cache";
  cacheLife("hours");
  cacheTag("chats", `chats-${userId}`);

  try {
    const chats = await prisma.chat.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        messages: include?.messages,
        diagnosis: include?.diagnosis,
        tempDiagnoses: include?.tempDiagnoses,
      },
    });

    return { success: chats };
  } catch (error) {
    console.error(`Could not get chats: ${error}`);

    return { error: `Could not get chats: ${error}` };
  }
};

export const getChatById = async (chatId: string) => {
  "use cache";
  cacheLife("hours");
  cacheTag("chat", `chat-${chatId}`);

  try {
    const chat = await prisma.chat.findUnique({
      where: {
        chatId,
      },
    });

    return { success: chat };
  } catch (error) {
    console.error(`Could not get chat: ${error}`);

    return { error: `Could not get chat: ${error}` };
  }
};
