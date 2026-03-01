"use server";

import { CreateDiagnosisSchema } from "@/schemas/CreateDiagnosisSchema";
import { getCurrentDbUser } from "@/utils/user";
import prisma from "@/prisma/prisma";
import { actionClient } from "./client";
import { revalidatePath, revalidateTag, updateTag } from "next/cache";

export const createDiagnosis = actionClient
  .inputSchema(CreateDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { chatId, messageId, location } = parsedInput;

    const { success: dbUser, error } = await getCurrentDbUser();
    
    if (!dbUser) {
      return { error: `Error fetching user: ${error}` };
    }

    const chat = await prisma.chat.findFirst({
      where: {
        chatId,
        userId: dbUser.id,
      },
      select: {
        chatId: true,
        hasDiagnosis: true,
      },
    });

    if (!chat) {
      return { error: "Chat not found or unauthorized" };
    }

    if (chat.hasDiagnosis) {
      return { error: "This diagnosis has already been recorded." };
    }

    const existingDiagnosis = await prisma.diagnosis.findUnique({
      where: { chatId },
      select: { id: true },
    });

    if (existingDiagnosis) {
      return { error: "A diagnosis already exists for this chat." };
    }

    const latestDiagnosisMessage = await prisma.message.findFirst({
      where: {
        chatId,
        role: "AI",
        type: "DIAGNOSIS",
      },
      include: {
        tempDiagnosis: true,
        explanation: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    if (!latestDiagnosisMessage) {
      return { error: "No diagnosis message available to record." };
    }

    if (latestDiagnosisMessage.id !== messageId) {
      return { error: "Only the latest diagnosis can be recorded." };
    }

    if (!latestDiagnosisMessage.tempDiagnosis) {
      return { error: "Latest diagnosis is missing temporary diagnosis data." };
    }

    if (!latestDiagnosisMessage.explanation) {
      return { error: "Latest diagnosis has no explanation yet." };
    }

    const tempDiagnosis = latestDiagnosisMessage.tempDiagnosis;

    const createdDiagnosis = await prisma.$transaction(async (tx) => {
      const diagnosis = await tx.diagnosis.create({
        data: {
          confidence: tempDiagnosis.confidence,
          uncertainty: tempDiagnosis.uncertainty,
          symptoms: tempDiagnosis.symptoms,
          modelUsed: tempDiagnosis.modelUsed,
          disease: tempDiagnosis.disease,
          chatId,
          userId: dbUser.id,
          latitude: location?.latitude,
          longitude: location?.longitude,
          city: location?.city,
          province: location?.province,
          region: location?.region,
          barangay: location?.barangay,
        },
      });

      await tx.explanation.update({
        where: { messageId: latestDiagnosisMessage.id },
        data: { diagnosisId: diagnosis.id },
      });

      await tx.chat.update({
        where: { chatId },
        data: {
          hasDiagnosis: true,
        },
      });

      return diagnosis;
    });

    updateTag("messages");
    updateTag(`messages-${chatId}`);
    updateTag("diagnosis");
    updateTag(`diagnosis-${chatId}`);
    revalidateTag(`chats-${dbUser.id}`, "max");
    revalidatePath("/diagnosis/[chatId]", "page");
    revalidatePath("/history");

    return {
      success: "Successfully recorded diagnosis",
      diagnosisId: createdDiagnosis.id,
    };
  });
