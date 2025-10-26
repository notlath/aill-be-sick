import * as z from "zod";

export const ExplainDiagnosisSchema = z.object({
  symptoms: z.string().min(1, "Symptoms cannot be empty"),
  meanProbs: z.array(z.array(z.number())),
});

export type ExplainDiagnosisInput = z.infer<typeof ExplainDiagnosisSchema>;
