import * as z from "zod";

export const SaveClinicalVerificationSchema = z.object({
  chatId: z.string().min(1, "Chat ID cannot be empty"),
  disease: z.string().min(1, "Disease cannot be empty"),
  selectedSymptomIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one symptom")
    .max(20, "Too many symptoms selected"),
});

export type SaveClinicalVerificationInput = z.infer<
  typeof SaveClinicalVerificationSchema
>;
