import { z } from "zod";

export const OnboardingSchema = z.object({
  birthday: z.string().min(1, "Birthday is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], {
    errorMap: () => ({ message: "Please select a gender" }),
  } as any),
  address: z.string().min(1, "Address is required"),
  district: z.string().min(1, "District or zone is required"),
  city: z.string().min(1),
  barangay: z.string().min(1),
  region: z.string().min(1),
  province: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
