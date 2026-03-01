import { z } from "zod";

export const OnboardingSchema = z.object({
  birthday: z.string().min(1, "Birthday is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], {
    errorMap: () => ({ message: "Please select a gender" }),
  } as any),
  region: z.string().min(1, "Region is required"),
  province: z.string().min(1, "Province is required"),
  city: z.string().min(1, "City/Municipality is required"),
  barangay: z.string().min(1, "Barangay is required"),
});
