import * as z from "zod";

export const CreateDiagnosisSchema = z.object({
  symptoms: z.string().min(1, "Symptoms description is required"),
  chatId: z.string().min(1, "Chat ID is required"),
});

export type CreateDiagnosisSchemaType = z.infer<typeof CreateDiagnosisSchema>;
