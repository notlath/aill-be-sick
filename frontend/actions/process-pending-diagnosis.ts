"use server";

import { ProcessPendingDiagnosisSchema } from "@/schemas/ProcessPendingDiagnosisSchema";
import { getCurrentDbUser } from "@/utils/user";
import prisma from "@/prisma/prisma";
import { actionClient } from "./client";
import { runDiagnosisCycleForChat } from "@/utils/diagnosis-cycle";

export const processPendingDiagnosis = actionClient
  .inputSchema(ProcessPendingDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { chatId } = parsedInput;
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
      },
    });

    if (!chat) {
      return { error: "Chat not found or unauthorized" };
    }

    const result = await runDiagnosisCycleForChat(chatId);

    return {
      success: "Processed pending diagnosis",
      ...result,
    };
  });
