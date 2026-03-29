import * as z from "zod";

export const RegenerateCredentialsSchema = z.object({
  patientId: z.number().int().positive("Patient ID is required"),
});

export type RegenerateCredentialsSchemaType = z.infer<typeof RegenerateCredentialsSchema>;
