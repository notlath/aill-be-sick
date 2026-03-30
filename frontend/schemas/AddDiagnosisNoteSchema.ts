import * as z from "zod";

export const AddDiagnosisNoteSchema = z.object({
  diagnosisId: z.number().positive("Valid diagnosis ID is required"),
  content: z
    .string()
    .min(1, "Note content cannot be empty")
    .max(1000, "Note cannot exceed 1000 characters"),
});
