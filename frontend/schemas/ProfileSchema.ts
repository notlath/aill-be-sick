import { z } from "zod";

export const ProfileSchema = z.object({
  birthday: z.string().min(1, "Birthday is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  address: z.string().min(1, "Address is required"),
  district: z.string().min(1, "District or zone is required"),
  city: z.string().min(1),
  barangay: z.string().min(1),
  region: z.string().min(1),
  province: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type ProfileSchemaType = z.infer<typeof ProfileSchema>;
