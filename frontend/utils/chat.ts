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
