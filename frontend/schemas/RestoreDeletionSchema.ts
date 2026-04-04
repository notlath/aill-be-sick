import * as z from "zod";

export const RestoreDeletionSchema = z.object({
  patientId: z.number().min(1, "Patient ID is required"),
});
