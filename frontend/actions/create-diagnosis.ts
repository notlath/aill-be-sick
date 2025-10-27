"use server";

import { CreateDiagnosisSchema } from "@/schemas/CreateDiagnosisSchema";
import { actionClient } from "./client";
import { getCurrentDbUser } from "@/utils/user";
import prisma from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

export const createDiagnosis = actionClient
  .inputSchema(CreateDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const {
      confidence,
      uncertainty,
      modelUsed,
      disease,
      chatId,
      symptoms,
      location,
      messageId,
    } = parsedInput;
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
      const explanation = await prisma.explanation.findUnique({
        where: { messageId },
      });

      if (!explanation) {
        console.error(`Explanation not found for messageId: ${messageId}`);

        return {
          error: `Explanation not found for messageId: ${messageId}`,
        };
      }

      await prisma.diagnosis.create({
        data: {
          confidence,
          uncertainty,
          modelUsed,
          disease,
          chatId,
          symptoms,
          userId: dbUser.id,
          latitude: location.latitude,
          longitude: location.longitude,
          city: location.city,
          region: location.region,
          explanation: {
            connect: {
              id: explanation.id,
            },
          },
        },
      });

      await prisma.chat.update({
        where: { chatId },
        data: { hasDiagnosis: true },
      });

      await prisma.tempDiagnosis.deleteMany({
        where: { chatId },
      });

      revalidatePath("/diagnosis/[chatId]", "page");

      return { success: "Successfully recorded diagnosis" };
    } catch (error) {
      console.error(`Error creating diagnosis: ${error}`);

      return { error: `Error creating diagnosis: ${error}` };
    }
  });
