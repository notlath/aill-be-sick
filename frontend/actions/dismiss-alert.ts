"use server";

import prisma from "@/prisma/prisma";
import { AlertIdSchema } from "@/schemas/AlertIdSchema";
import { actionClient } from "./client";

export const dismissAlert = actionClient
  .inputSchema(AlertIdSchema)
  .action(async ({ parsedInput }) => {
    const { alertId } = parsedInput;

    try {
      const alert = await prisma.alert.update({
        where: { id: alertId },
        data: { status: "DISMISSED" },
      });

      return { success: alert };
    } catch (error) {
      console.error(`Error dismissing alert: ${error}`);

      return { error: "Failed to dismiss alert." };
    }
  });
