import * as z from "zod";

export const AlertNoteSchema = z.object({
  alertId: z.number().min(1, "Alert ID is required"),
  content: z.string().min(1, "Note content is required").max(2000, "Note must be 2000 characters or fewer"),
});

export type AlertNoteInput = z.infer<typeof AlertNoteSchema>;
