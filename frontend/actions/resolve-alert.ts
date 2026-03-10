"use server";

import prisma from "@/prisma/prisma";
import { AlertIdSchema } from "@/schemas/AlertIdSchema";
import { getCurrentDbUser } from "@/utils/user";
import { actionClient } from "./client";

export const resolveAlert = actionClient
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
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolvedBy: dbUser.id,
        },
      });

      return { success: alert };
    } catch (err) {
      console.error(`Error resolving alert: ${err}`);
      return { error: "Failed to resolve alert." };
    }
  });
