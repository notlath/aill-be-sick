import * as z from "zod";

export const CreateMessageSchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
  chatId: z.string().min(1, "Chat ID cannot be empty"),
  type: z
    .enum(["SYMPTOMS", "ANSWER", "QUESTION", "DIAGNOSIS"])
    .default("QUESTION"),
  role: z.enum(["USER", "AI"]).default("USER"),
});

export type CreateMessageSchemaType = z.infer<typeof CreateMessageSchema>;
