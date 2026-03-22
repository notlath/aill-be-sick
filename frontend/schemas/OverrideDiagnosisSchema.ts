import * as z from "zod";

export const OverrideDiagnosisSchema = z.object({
  diagnosisId: z.number().min(1, "Diagnosis ID is required"),
  clinicianDisease: z.enum([
    "DENGUE",
    "PNEUMONIA",
    "TYPHOID",
    "DIARRHEA",
    "MEASLES",
    "INFLUENZA",
    "IMPETIGO",
  ]),
  clinicianNotes: z
    .string()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional(),
});

export type OverrideDiagnosisInput = z.infer<typeof OverrideDiagnosisSchema>;
