import * as z from "zod";

export const RunDiagnosisSchema = z.object({
  symptoms: z.string().min(1, "Symptoms are required"),
  chatId: z.string().min(1, "Chat ID cannot be empty"),
  skipMessage: z.boolean().optional(), // Skip creating diagnosis message (for confirmatory flow)
});

export type RunDiagnosisSchemaType = z.infer<typeof RunDiagnosisSchema>;
