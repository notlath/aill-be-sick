"use server";

import prisma from "@/prisma/prisma";
import { CreateMessageSchema } from "@/schemas/CreateMessageSchema";
import { getCurrentDbUser } from "@/utils/user";
import { hasActiveDeletionSchedule } from "@/utils/check-deletion-schedule";
import { revalidatePath, revalidateTag } from "next/cache";
import { actionClient } from "./client";

export const createMessage = actionClient
  .inputSchema(CreateMessageSchema)
  .action(async ({ parsedInput }) => {
    const { content, chatId, type, role, tempDiagnosis } = parsedInput;

    const { success: dbUser, error: userError } = await getCurrentDbUser();
    if (dbUser && dbUser.role === "PATIENT") {
      const hasSchedule = await hasActiveDeletionSchedule(dbUser.id);
      if (hasSchedule) {
        return { error: "Your account is scheduled for deletion. Please keep your account or exit to continue using the app." };
      }
    }

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
                isValid: tempDiagnosis.is_valid ?? true,
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
