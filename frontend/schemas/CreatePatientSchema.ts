import { z } from "zod";

export const CreatePatientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  suffix: z.string().optional(),
  email: z.string().email("Invalid email address"),
  birthday: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Please select a gender"),
  address: z.string().min(1, "Address is required"),
  district: z.string().min(1, "District or zone is required"),
  city: z.string().min(1, "City is required"),
  barangay: z.string().min(1, "Barangay is required"),
  region: z.string().min(1, "Region is required"),
  province: z.string().min(1, "Province is required"),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  // Guardian information
  guardianName: z.string().optional(),
  guardianEmail: z.string().email("Invalid guardian email address").optional(),
  guardianPhone: z.string().optional(),
  guardianRelation: z.string().optional(),
  guardianConsent: z.boolean().optional(),
});

export type CreatePatientSchemaType = z.infer<typeof CreatePatientSchema>;
