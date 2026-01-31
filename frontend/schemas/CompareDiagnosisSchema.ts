import { z } from "zod";

export const CompareDiagnosisSchema = z.object({
  symptoms: z.string().min(1, "Symptoms are required"),
});
