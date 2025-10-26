import * as z from "zod";

export const ExplainDiagnosisSchema = z.object({
  symptoms: z.string().min(1, "Symptoms cannot be empty"),
  meanProbs: z.array(z.array(z.number())),
  diagnosisId: z.number().optional(),
  messageId: z.number().min(1, "Message ID must be a positive integer"),
});

export type ExplainDiagnosisInput = z.infer<typeof ExplainDiagnosisSchema>;
