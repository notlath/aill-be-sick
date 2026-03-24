import * as z from "zod";

export const ApproveClinicianSchema = z.object({
  clinicianUserId: z.number().int().positive(),
});

export const RejectClinicianSchema = z.object({
  clinicianUserId: z.number().int().positive(),
  reason: z.string().trim().max(500).optional(),
});

export type ApproveClinicianSchemaType = z.infer<typeof ApproveClinicianSchema>;
export type RejectClinicianSchemaType = z.infer<typeof RejectClinicianSchema>;
