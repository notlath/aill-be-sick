import * as z from "zod";

export const CreateChatSchema = z.object({
  symptoms: z
    .string()
    .min(20, "Please describe your symptoms in at least 20 characters"),
  chatId: z.string().min(1, "Chat ID is required"),
});

export type CreateChatSchemaType = z.infer<typeof CreateChatSchema>;
