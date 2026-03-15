import * as z from "zod";

/**
 * Schema for discarding a temporary diagnosis.
 * Allows users to explicitly opt-out of having their diagnosis recorded.
 * This deletes the TempDiagnosis and any associated Explanation records.
 */
export const DiscardDiagnosisSchema = z.object({
  chatId: z.string().min(1, "Chat ID cannot be empty"),
});

export type DiscardDiagnosisInput = z.infer<typeof DiscardDiagnosisSchema>;
