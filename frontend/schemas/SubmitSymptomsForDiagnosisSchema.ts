import * as z from "zod";

export const SubmitSymptomsForDiagnosisSchema = z.object({
  chatId: z.string().min(1, "Chat ID cannot be empty"),
  symptoms: z.string().min(1, "Symptoms are required"),
});

export type SubmitSymptomsForDiagnosisSchemaType = z.infer<
  typeof SubmitSymptomsForDiagnosisSchema
>;
