import * as z from "zod";

export const CreateAlertSchema = z.object({
  type: z.enum(["ANOMALY", "LOW_CONFIDENCE", "HIGH_UNCERTAINTY"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  diagnosisId: z.number().optional(),
  reasonCodes: z.array(z.string()).min(1, "At least one reason code is required"),
  message: z.string().min(1, "Alert message is required"),
  metadata: z
    .object({
      disease: z.string().optional(),
      city: z.string().optional(),
      province: z.string().optional(),
      region: z.string().optional(),
      barangay: z.string().optional(),
      district: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      patientAge: z.number().optional(),
      patientGender: z.string().optional(),
      anomalyScore: z.number().optional(),
      confidence: z.number().optional(),
      uncertainty: z.number().optional(),
    })
    .optional(),
});

export type CreateAlertInput = z.infer<typeof CreateAlertSchema>;
