import * as z from "zod";

export const CreateMessageSchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
  chatId: z.string().min(1, "Chat ID cannot be empty"),
  type: z
    .enum(["SYMPTOMS", "ANSWER", "QUESTION", "DIAGNOSIS", "ERROR"])
    .default("QUESTION"),
  role: z.enum(["USER", "AI"]).default("USER"),
  tempDiagnosis: z
    .object({
      confidence: z.number().min(-0.1).max(1.1),
      uncertainty: z.number().min(-0.1).max(1.1),
      modelUsed: z.enum(["BIOCLINICAL_MODERNBERT", "ROBERTA_TAGALOG"]),
      disease: z.enum([
        "DENGUE",
        "PNEUMONIA",
        "TYPHOID",
        "DIARRHEA",
        "MEASLES",
        "INFLUENZA",
        "IMPETIGO",
      ]),
      symptoms: z.string(),
    })
    .optional(),
});

export type CreateMessageSchemaType = z.infer<typeof CreateMessageSchema>;
