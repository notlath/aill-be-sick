import * as z from "zod";

export const UpdateProfileSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }).max(100),
  avatar: z.string().optional(),
  region: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  barangay: z.string().optional(),
});

export type UpdateProfileSchemaType = z.infer<typeof UpdateProfileSchema>;
