"use server";

import { CreateMessageSchema } from "@/schemas/CreateMessageSchema";
import { actionClient } from "./client";
import prisma from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

export const createMessage = actionClient
  .inputSchema(CreateMessageSchema)
  .action(async ({ parsedInput }) => {
    const { content, chatId, type, role, tempDiagnosis } = parsedInput;

    try {
      if (tempDiagnosis) {
        const message = await prisma.message.create({
          data: {
            content,
            chatId,
            role,
            type,
            tempDiagnosis: {
              create: {
                confidence: tempDiagnosis.confidence,
                uncertainty: tempDiagnosis.uncertainty,
                modelUsed: tempDiagnosis.modelUsed,
                disease: tempDiagnosis.disease,
              },
            },
          },
        });

        revalidatePath("/diagnosis/[chatId]", "page");

        return { success: "Successfully created message with temp diagnosis" };
      }

      await prisma.message.create({
        data: {
          content,
          chatId,
          role,
          type,
        },
      });

      revalidatePath("/diagnosis/[chatId]", "page");

      return { success: "Successfully created message" };
    } catch (error) {
      console.error(`Error creating message: ${error}`);

      return { error: `Error creating message: ${error}` };
    }
  });
