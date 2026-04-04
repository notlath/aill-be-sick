import * as z from "zod";

export const RestoreDeletionSchema = z.object({
  patientId: z.number({ required_error: "Patient ID is required" }),
});
