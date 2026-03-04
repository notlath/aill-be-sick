"use server";

import prisma from "@/prisma/prisma";
import { DeleteChatSchema } from "@/schemas/DeleteChatSchema";
import { getCurrentDbUser } from "@/utils/user";
import { revalidatePath, updateTag } from "next/cache";
import { actionClient } from "./client";

export const deleteChat = actionClient
  .inputSchema(DeleteChatSchema)
  .action(async ({ parsedInput }) => {
    const { chatId } = parsedInput;
    const { success: dbUser, error } = await getCurrentDbUser();

    if (!dbUser) {
      console.error(`Error fetching user: ${error}`);
      return { error: `Error fetching user: ${error}` };
    }

    if (error) {
      console.error(`Error fetching user: ${error}`);
      return { error: `Error fetching user: ${error}` };
    }

    try {
      const chat = await prisma.chat.findFirst({
        where: {
          chatId,
          userId: dbUser.id,
        },
        select: {
          chatId: true,
        },
      });

      if (!chat) {
        return { error: "Chat not found or unauthorized" };
      }

      await prisma.chat.delete({
        where: {
          chatId: chat.chatId,
        },
      });

      updateTag(`chats-${dbUser.id}`);
      updateTag(`chat-${chat.chatId}`);
      updateTag(`messages-${chat.chatId}`);
      updateTag(`diagnosis-${chat.chatId}`);
      revalidatePath("/history", "page");
      revalidatePath(`/diagnosis/${chat.chatId}`, "page");

      return { success: "Chat deleted successfully" };
    } catch (deleteError) {
      console.error(`Error deleting chat: ${deleteError}`);
      return { error: `Error deleting chat: ${deleteError}` };
    }
  });