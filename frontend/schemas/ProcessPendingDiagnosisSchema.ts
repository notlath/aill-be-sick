import * as z from "zod";

export const ProcessPendingDiagnosisSchema = z.object({
  chatId: z.string().min(1, "Chat ID cannot be empty"),
});

export type ProcessPendingDiagnosisSchemaType = z.infer<
  typeof ProcessPendingDiagnosisSchema
>;
