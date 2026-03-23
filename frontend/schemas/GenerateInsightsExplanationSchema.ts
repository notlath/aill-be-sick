import * as z from "zod";

export const GenerateInsightsExplanationSchema = z.object({
  tokens: z.array(z.string()).min(1, "At least one token is required"),
  importances: z.array(z.number()).min(1, "At least one importance value is required"),
  disease: z.string().min(1, "Disease name is required"),
  symptoms: z.string().min(1, "Original symptoms text is required"),
});

export type GenerateInsightsExplanationInput = z.infer<typeof GenerateInsightsExplanationSchema>;
