"use server";

import prisma from "@/prisma/prisma";
import { getCurrentDbUser } from "./user";

export const getChats = async (include?: { messages?: boolean }) => {
  const { success: dbUser, error } = await getCurrentDbUser();

  if (!dbUser) {
    console.error(`Could not get user: ${error}`);

    return { error: `Could not get user: ${error}` };
  }

  if (error) {
    console.error(`Could not get user: ${error}`);

    return { error: `Could not get user: ${error}` };
  }

  try {
    const chats = await prisma.chat.findMany({
      where: {
        userId: dbUser.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        messages: include?.messages,
      },
    });

    return { success: chats };
  } catch (error) {
    console.error(`Could not get chats: ${error}`);

    return { error: `Could not get chats: ${error}` };
  }
};

export const getChatById = async (chatId: string) => {
  const { success: dbUser, error } = await getCurrentDbUser();

  if (!dbUser) {
    console.error(`Could not get user: ${error}`);

    return { error: `Could not get user: ${error}` };
  }

  if (error) {
    console.error(`Could not get user: ${error}`);

    return { error: `Could not get user: ${error}` };
  }

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
