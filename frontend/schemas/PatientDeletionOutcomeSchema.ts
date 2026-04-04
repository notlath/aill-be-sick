import * as z from "zod";

export const PatientDeletionOutcomeSchema = z.object({
  action: z.enum(["restore", "confirm"]),
});
