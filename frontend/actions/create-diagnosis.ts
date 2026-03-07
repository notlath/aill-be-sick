"use server";

import prisma from "@/prisma/prisma";
import { CreateDiagnosisSchema } from "@/schemas/CreateDiagnosisSchema";
import { getCurrentDbUser } from "@/utils/user";
import { revalidatePath, revalidateTag } from "next/cache";
import { actionClient } from "./client";

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
          city: dbUser.city,
          province: dbUser.province,
          region: dbUser.region,
          barangay: dbUser.barangay,
          ...(explanation
            ? {
                explanation: {
                  connect: {
                    id: explanation.id,
                  },
                },
              }
            : {}),
        },
      });

      await prisma.chat.update({
        where: { chatId },
        data: { hasDiagnosis: true },
      });

      await prisma.tempDiagnosis.deleteMany({
        where: { chatId },
      });

      revalidateTag(`messages-${chatId}`, { expire: 0 });
      revalidateTag("diagnosis", { expire: 0 });
      revalidateTag(`diagnosis-${chatId}`, { expire: 0 });
      revalidateTag("chat", { expire: 0 });
      revalidateTag(`chat-${chatId}`, { expire: 0 });
      revalidatePath(`/diagnosis/${chatId}`, "page");
      revalidatePath("/history", "page");

      return { success: "Successfully recorded diagnosis" };
    } catch (error) {
      console.error(`Error creating diagnosis: ${error}`);

      return { error: `Error creating diagnosis: ${error}` };
    }
  });
