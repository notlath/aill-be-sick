"use server";

import prisma from "@/prisma/prisma";
import { CreateChatSchema } from "@/schemas/CreateChatSchema";
import { getCurrentDbUser } from "@/utils/user";
import { revalidatePath, revalidateTag } from "next/cache";
import { actionClient } from "./client";

export const createChat = actionClient
  .inputSchema(CreateChatSchema)
  .action(async ({ parsedInput }) => {
    const { symptoms, chatId } = parsedInput;
    const { success: user, error } = await getCurrentDbUser();

    if (!user) {
      console.error(`Error fetching current user: ${error}`);

      return { error: `Error fetching current user: ${error}` };
    }

    if (error) {
      console.error(`Error fetching current user: ${error}`);

      return { error: `Error fetching current user: ${error}` };
    }

    try {
      await prisma.chat.create({
        data: {
          chatId,
          messages: {
            create: {
              role: "USER",
              content: symptoms,
            },
          },
          userId: user.id,
        },
      });

      revalidateTag(`chats-${user.id}`, 'max');
      revalidatePath("/history");

      return { success: { chatId, symptoms } };
    } catch (error) {
      console.error(`Error creating new chat: ${error}`);

      return { error: `Error creating new chat: ${error}` };
    }
  });
