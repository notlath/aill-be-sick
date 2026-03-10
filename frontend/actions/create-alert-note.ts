"use server";

import prisma from "@/prisma/prisma";
import { AlertNoteSchema } from "@/schemas/AlertNoteSchema";
import { getCurrentDbUser } from "@/utils/user";
import { actionClient } from "./client";

export const createAlertNote = actionClient
  .inputSchema(AlertNoteSchema)
  .action(async ({ parsedInput }) => {
    const { alertId, content } = parsedInput;
    const { success: dbUser, error } = await getCurrentDbUser();

    if (!dbUser) {
      console.error(`Error fetching user: ${error}`);
      return { error: `Error fetching user: ${error}` };
    }

    try {
      const note = await prisma.alertNote.create({
        data: {
          alertId,
          authorId: dbUser.id,
          content,
        },
        include: {
          author: { select: { name: true } },
        },
      });

      return {
        success: {
          id: note.id,
          alertId: note.alertId,
          authorId: note.authorId,
          authorName: note.author?.name ?? null,
          content: note.content,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
        },
      };
    } catch (err) {
      console.error(`Error creating alert note: ${err}`);
      return { error: "Failed to create note." };
    }
  });
