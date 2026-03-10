"use server";

import prisma from "@/prisma/prisma";
import { UpdateAlertNoteSchema } from "@/schemas/UpdateAlertNoteSchema";
import { getCurrentDbUser } from "@/utils/user";
import { actionClient } from "./client";

export const updateAlertNote = actionClient
  .inputSchema(UpdateAlertNoteSchema)
  .action(async ({ parsedInput }) => {
    const { noteId, content } = parsedInput;
    const { success: dbUser, error } = await getCurrentDbUser();

    if (!dbUser) {
      console.error(`Error fetching user: ${error}`);
      return { error: `Error fetching user: ${error}` };
    }

    // Verify the current user is the author of this note.
    const existing = await prisma.alertNote.findUnique({
      where: { id: noteId },
    });

    if (!existing) {
      return { error: "Note not found." };
    }

    if (existing.authorId !== dbUser.id) {
      return { error: "You can only edit your own notes." };
    }

    try {
      const note = await prisma.alertNote.update({
        where: { id: noteId },
        data: { content },
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
      console.error(`Error updating alert note: ${err}`);
      return { error: "Failed to update note." };
    }
  });
