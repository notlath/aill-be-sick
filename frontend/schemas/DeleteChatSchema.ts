import * as z from "zod";

export const DeleteChatSchema = z.object({
  chatId: z.string().min(1, "Chat ID cannot be empty"),
});