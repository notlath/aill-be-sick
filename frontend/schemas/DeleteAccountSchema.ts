import * as z from "zod";

export const DeleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required for account deletion"),
});