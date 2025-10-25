import * as z from "zod";

export const RunTempDiagnosisSchema = z.object({
  symptoms: z.string().min(1, "Symptoms are required"),
});

export type RunTempDiagnosisSchemaType = z.infer<typeof RunTempDiagnosisSchema>;
