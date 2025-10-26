import * as z from "zod";

export const ExplainDiagnosisSchema = z
  .object({
    symptoms: z.string().min(1, "Symptoms cannot be empty"),
    meanProbs: z.array(z.array(z.number())),
    diagnosisId: z.number().optional(),
    tempDiagnosisId: z.number().optional(),
  })
  .refine(
    (obj) => obj.diagnosisId !== undefined || obj.tempDiagnosisId !== undefined,
    { message: "Either diagnosisId or tempDiagnosisId must be provided" }
  );

export type ExplainDiagnosisInput = z.infer<typeof ExplainDiagnosisSchema>;
