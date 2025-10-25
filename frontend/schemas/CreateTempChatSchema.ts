import * as z from "zod";

export const CreateTempChatSchema = z.object({
  symptoms: z.string().min(1, "Symptoms description is required"),
});

export type CreateTempChatSchemaType = z.infer<typeof CreateTempChatSchema>;
