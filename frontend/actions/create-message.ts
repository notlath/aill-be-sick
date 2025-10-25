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
      let createdMessage;

      if (tempDiagnosis) {
        createdMessage = await prisma.message.create({
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
                symptoms: tempDiagnosis.symptoms,
                chatId,
              },
            },
          },
          include: {
            tempDiagnosis: true,
          },
        });
      } else {
        createdMessage = await prisma.message.create({
          data: {
            content,
            chatId,
            role,
            type,
          },
        });
      }

      revalidatePath("/diagnosis/[chatId]", "page");

      return { success: createdMessage };
    } catch (error) {
      console.error(`Error creating message: ${error}`);

      return { error: `Error creating message: ${error}` };
    }
  });
