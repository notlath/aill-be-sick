"use server";

import { SubmitSymptomsForDiagnosisSchema } from "@/schemas/SubmitSymptomsForDiagnosisSchema";
import { getCurrentDbUser } from "@/utils/user";
import prisma from "@/prisma/prisma";
import { actionClient } from "./client";
import { revalidatePath, updateTag } from "next/cache";
import { runDiagnosisCycleForChat } from "@/utils/diagnosis-cycle";

export const submitSymptomsForDiagnosis = actionClient
  .inputSchema(SubmitSymptomsForDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { chatId, symptoms } = parsedInput;
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
      return { error: "This diagnosis conversation is already finalized." };
    }

    const createdUserMessage = await prisma.message.create({
      data: {
        chatId,
        role: "USER",
        type: "SYMPTOMS",
        content: symptoms,
      },
      select: {
        id: true,
      },
    });

    updateTag("messages");
    updateTag(`messages-${chatId}`);
    revalidatePath("/diagnosis/[chatId]", "page");

    const cycleResult = await runDiagnosisCycleForChat(chatId);

    return {
      success: "Symptoms submitted and processed",
      createdUserMessageId: createdUserMessage.id,
      diagnosisMessageId: cycleResult.diagnosisMessageId,
      explanationReady: cycleResult.explanationReady,
      status: cycleResult.status,
      errorCode: cycleResult.errorCode,
    };
  });
