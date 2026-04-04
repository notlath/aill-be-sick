import * as z from "zod";

export const ScheduleDeletionSchema = z.object({
  patientId: z.number().min(1, "Patient ID is required"),
  reason: z.string().min(1, "Reason is required"),
});
