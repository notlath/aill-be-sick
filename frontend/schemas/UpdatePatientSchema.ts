import * as z from "zod";

export const UpdatePatientSchema = z.object({
  patientId: z.number(),
  name: z.string().min(1, { message: "Name is required" }).max(100),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  birthday: z
    .string()
    .min(1, { message: "Birthday is required" })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    }),
  address: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  barangay: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

export type UpdatePatientSchemaType = z.infer<typeof UpdatePatientSchema>;
