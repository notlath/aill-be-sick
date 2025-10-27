import * as z from "zod";

export const CreateDiagnosisSchema = z.object({
  confidence: z.number().min(0).max(1),
  uncertainty: z.number().min(0).max(1),
  symptoms: z.string().min(1, "Symptoms cannot be empty"),
  modelUsed: z.enum(["BIOCLINICAL_MODERNBERT", "ROBERTA_TAGALOG"]),
  disease: z.enum(["DENGUE", "PNEUMONIA", "TYPHOID", "IMPETIGO"]),
  chatId: z.string().min(1, "Chat ID cannot be empty"),
  messageId: z.number().min(1, "Message ID cannot be empty"),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    city: z.string().optional(),
    region: z.string().optional(),
  }),
});
