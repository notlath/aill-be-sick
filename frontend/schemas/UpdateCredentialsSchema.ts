import * as z from "zod";

export const UpdateEmailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const UpdatePasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export type UpdateEmailSchemaType = z.infer<typeof UpdateEmailSchema>;
export type UpdatePasswordSchemaType = z.infer<typeof UpdatePasswordSchema>;
