import * as z from "zod";

export const CreateChatSchema = z.object({
  symptoms: z.string().min(1, "Symptoms description is required"),
  chatId: z.string().min(1, "Chat ID is required"),
});

export type CreateChatSchemaType = z.infer<typeof CreateChatSchema>;
