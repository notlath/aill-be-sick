"use server";

import prisma from "@/prisma/prisma";
import { CreateMessageSchema } from "@/schemas/CreateMessageSchema";
import { revalidatePath, revalidateTag } from "next/cache";
import { actionClient } from "./client";

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
                cdss: tempDiagnosis.cdss ?? undefined,
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

      revalidateTag(`messages-${chatId}`, { expire: 0 });
      revalidatePath(`/diagnosis/${chatId}`, "page");

      return { success: createdMessage };
    } catch (error) {
      console.error(`Error creating message: ${error}`);

      return { error: `Error creating message: ${error}` };
    }
  });
