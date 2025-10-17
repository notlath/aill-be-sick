import * as z from "zod";

export const RunDiagnosisSchema = z.object({
  symptoms: z.string().min(1, "Symptoms are required"),
  chatId: z.string().min(1, "Chat ID cannot be empty"),
});

export type RunDiagnosisSchemaType = z.infer<typeof RunDiagnosisSchema>;
