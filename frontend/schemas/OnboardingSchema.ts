import { z } from "zod";

export const OnboardingSchema = z.object({
  birthday: z.string().min(1, "Birthday is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], {
    errorMap: () => ({ message: "Please select a gender" }),
  } as any),
  // User input
  city: z.string().min(1, "City/Municipality is required"),
  barangay: z.string().min(1, "Barangay is required"),
  // Auto-filled but user can edit
  region: z.string().min(1, "Region is required"),
  province: z.string().min(1, "Province is required"),
  district: z.string().optional(), // Optional district for NCR and similar divisions
});
