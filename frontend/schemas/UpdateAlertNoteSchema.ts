import * as z from "zod";

export const UpdateAlertNoteSchema = z.object({
  noteId: z.number().min(1, "Note ID is required"),
  content: z.string().min(1, "Note content is required").max(2000, "Note must be 2000 characters or fewer"),
});

export type UpdateAlertNoteInput = z.infer<typeof UpdateAlertNoteSchema>;
