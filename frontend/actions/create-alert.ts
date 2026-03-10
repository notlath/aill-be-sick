"use server";

import prisma from "@/prisma/prisma";
import { CreateAlertSchema } from "@/schemas/CreateAlertSchema";
import { actionClient } from "./client";

export const createAlert = actionClient
  .inputSchema(CreateAlertSchema)
  .action(async ({ parsedInput }) => {
    const { type, severity, diagnosisId, reasonCodes, message, metadata } =
      parsedInput;

    try {
      const alert = await prisma.alert.create({
        data: {
          type,
          severity,
          reasonCodes,
          message,
          metadata: metadata ?? {},
          ...(diagnosisId ? { diagnosisId } : {}),
        },
      });

      return { success: alert };
    } catch (error) {
      console.error(`Error creating alert: ${error}`);

      return { error: "Failed to create alert." };
    }
  });
