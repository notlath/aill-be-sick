import * as z from "zod";

export const RequestResetPasswordSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
});

export type RequestResetPasswordSchemaType = z.infer<
  typeof RequestResetPasswordSchema
>;

export const ResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters long" }),
    confirmPassword: z
      .string()
      .min(6, { message: "Password must be at least 6 characters long" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordSchemaType = z.infer<typeof ResetPasswordSchema>;
