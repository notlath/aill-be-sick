import * as z from "zod";

export const CreateChatSchema = z.object({
  symptoms: z
    .string()
    .min(20, "Please describe your symptoms in at least 20 characters"),
  chatId: z.string().min(1, "Chat ID is required"),
  daysOfIllness: z.enum(["Today", "1-2 days", "3-6 days", "7-10 days", "10+ days"], {
    message: "Please select how many days you have been ill"
  }),
  feverPresence: z.enum(["Yes", "No"], {
    message: "Please indicate if you have a fever"
  }),
});

export type CreateChatSchemaType = z.infer<typeof CreateChatSchema>;
