"use server";

import prisma from "@/prisma/prisma";
import { DeleteChatSchema } from "@/schemas/DeleteChatSchema";
import { getCurrentDbUser } from "@/utils/user";
import { hasActiveDeletionSchedule } from "@/utils/check-deletion-schedule";
import { revalidatePath, revalidateTag } from "next/cache";
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

    if (dbUser.role === "PATIENT") {
      const hasSchedule = await hasActiveDeletionSchedule(dbUser.id);
      if (hasSchedule) {
        return { error: "Your account is scheduled for deletion. Please keep your account or exit to continue using the app." };
      }
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

      revalidateTag(`chats-${dbUser.id}`, { expire: 0 });
      revalidateTag(`chat-${chat.chatId}`, { expire: 0 });
      revalidateTag(`messages-${chat.chatId}`, { expire: 0 });
      revalidateTag(`diagnosis-${chat.chatId}`, { expire: 0 });
      revalidatePath("/history", "page");
      revalidatePath(`/diagnosis/${chat.chatId}`, "page");

      return { success: "Chat deleted successfully" };
    } catch (deleteError) {
      console.error(`Error deleting chat: ${deleteError}`);
      return { error: `Error deleting chat: ${deleteError}` };
    }
  });
