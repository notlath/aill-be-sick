"use server";

import { CreateDiagnosisSchema } from "@/schemas/CreateDiagnosisSchema";
import { actionClient } from "./client";
import prisma from "@/prisma/prisma";
import { getCurrentDbUser } from "@/utils/user";

export const createChat = actionClient
  .inputSchema(CreateDiagnosisSchema)
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

      return { success: { chatId, symptoms } };
    } catch (error) {
      console.error(`Error creating new chat: ${error}`);

      return { error: `Error creating new chat: ${error}` };
    }
  });
