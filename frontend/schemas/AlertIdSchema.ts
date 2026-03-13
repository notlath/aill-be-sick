import * as z from "zod";

export const AlertIdSchema = z.object({
  alertId: z.number().min(1, "Alert ID is required"),
});

export type AlertIdInput = z.infer<typeof AlertIdSchema>;
