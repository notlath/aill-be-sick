import * as z from "zod";

// Access code format: PAT-XXXXXX (6 alphanumeric characters after prefix)
const ACCESS_CODE_PATTERN = /^PAT-[A-Z0-9]{6}$/;

export const AccessCodeAuthSchema = z.object({
  accessCode: z
    .string()
    .min(1, { message: "Access code is required" })
    .transform((val) => val.toUpperCase().trim())
    .refine((val) => ACCESS_CODE_PATTERN.test(val), {
      message: "Invalid access code format. Expected format: PAT-XXXXXX",
    }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" }),
});

export type AccessCodeAuthSchemaType = z.infer<typeof AccessCodeAuthSchema>;
