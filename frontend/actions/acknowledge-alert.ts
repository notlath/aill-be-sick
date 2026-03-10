"use server";

import prisma from "@/prisma/prisma";
import { AlertIdSchema } from "@/schemas/AlertIdSchema";
import { getCurrentDbUser } from "@/utils/user";
import { actionClient } from "./client";

export const acknowledgeAlert = actionClient
  .inputSchema(AlertIdSchema)
  .action(async ({ parsedInput }) => {
    const { alertId } = parsedInput;
    const { success: dbUser, error } = await getCurrentDbUser();

    if (!dbUser) {
      console.error(`Error fetching user: ${error}`);

      return { error: `Error fetching user: ${error}` };
    }

    try {
      const alert = await prisma.alert.update({
        where: { id: alertId },
        data: {
          status: "ACKNOWLEDGED",
          acknowledgedAt: new Date(),
          acknowledgedBy: dbUser.id,
        },
      });

      return { success: alert };
    } catch (error) {
      console.error(`Error acknowledging alert: ${error}`);

      return { error: "Failed to acknowledge alert." };
    }
  });
