import * as z from "zod";

/**
 * Helper to create a required consent field.
 * Accepts boolean input but validates that it must be true.
 */
const requiredConsent = (errorMessage: string) =>
  z.boolean().refine((val) => val === true, {
    message: errorMessage,
  });

/**
 * Schema for patient signup that includes consent checkboxes.
 * All consent fields must be explicitly set to true.
 */
export const SignupWithConsentSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" }),
  acceptedMedicalDisclaimer: requiredConsent(
    "You must acknowledge that this is a research tool, not medical advice"
  ),
  acceptedAgeRequirement: requiredConsent(
    "You must confirm you are 18+ or have parental/guardian permission"
  ),
  acceptedTermsAndPrivacy: requiredConsent(
    "You must accept the Privacy Policy and Terms of Service"
  ),
});

export type SignupWithConsentSchemaType = z.infer<
  typeof SignupWithConsentSchema
>;

/**
 * Schema for the consent modal (existing users, OAuth users).
 * Only includes consent fields, no credentials.
 */
export const ConsentOnlySchema = z.object({
  acceptedMedicalDisclaimer: requiredConsent(
    "You must acknowledge that this is a research tool, not medical advice"
  ),
  acceptedAgeRequirement: requiredConsent(
    "You must confirm you are 18+ or have parental/guardian permission"
  ),
  acceptedTermsAndPrivacy: requiredConsent(
    "You must accept the Privacy Policy and Terms of Service"
  ),
});

export type ConsentOnlySchemaType = z.infer<typeof ConsentOnlySchema>;
