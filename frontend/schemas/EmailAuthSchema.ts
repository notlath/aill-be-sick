import * as z from "zod";

export const EmailAuthSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" }),
});

export type EmailAuthSchemaType = z.infer<typeof EmailAuthSchema>;
