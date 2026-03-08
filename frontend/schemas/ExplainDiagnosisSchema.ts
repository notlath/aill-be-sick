import * as z from "zod";

export const ExplainDiagnosisSchema = z.object({
  symptoms: z.string().min(1, "Symptoms cannot be empty"),
  // Accept both flat [number] and nested [[number]] formats
  // Backend returns nested format [[p1, p2, ...]] but we handle both
  meanProbs: z.union([
    z.array(z.number()), // Flat format: [p1, p2, ...]
    z.array(z.array(z.number())), // Nested format: [[p1, p2, ...]]
  ]),
  diagnosisId: z.number().optional(),
  messageId: z.number().min(1, "Message ID must be a positive integer"),
});

export type ExplainDiagnosisInput = z.infer<typeof ExplainDiagnosisSchema>;
