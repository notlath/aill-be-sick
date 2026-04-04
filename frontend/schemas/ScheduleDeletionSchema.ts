import * as z from "zod";

export const ScheduleDeletionSchema = z.object({
  patientId: z.number({ required_error: "Patient ID is required" }),
  reason: z.string().min(1, "Reason is required"),
});
