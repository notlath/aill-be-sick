"use server";

import { actionClient } from "./client";
import { ConsentOnlySchema } from "@/schemas/SignupWithConsentSchema";
import prisma from "@/prisma/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentDbUser } from "@/utils/user";
import { LEGAL_CONSTANTS } from "@/constants/legal";

/**
 * Server action to record user acceptance of Terms of Service and Privacy Policy.
 * Used by:
 * - Existing users who haven't accepted terms
 * - OAuth users after first login
 * - Users who need to re-accept after terms update
 */
export const acceptTerms = actionClient
  .inputSchema(ConsentOnlySchema)
  .action(async ({ parsedInput }) => {
    // Validate all consent flags are true (enforced by schema, but double-check)
    const {
      acceptedMedicalDisclaimer,
      acceptedAgeRequirement,
      acceptedTermsAndPrivacy,
    } = parsedInput;

    if (
      !acceptedMedicalDisclaimer ||
      !acceptedAgeRequirement ||
      !acceptedTermsAndPrivacy
    ) {
      return { error: "All consent checkboxes must be accepted." };
    }

    // Get current authenticated user
    const userResult = await getCurrentDbUser();

    if ("error" in userResult) {
      return { error: "You must be logged in to accept terms." };
    }

    const user = userResult.success;

    try {
      // Update user with consent timestamps and versions
      await prisma.user.update({
        where: { id: user.id },
        data: {
          termsAcceptedAt: new Date(),
          privacyAcceptedAt: new Date(),
          termsVersion: LEGAL_CONSTANTS.TERMS_VERSION,
          privacyVersion: LEGAL_CONSTANTS.PRIVACY_VERSION,
        },
      });

      // Revalidate user cache to reflect updated consent status
      revalidateTag(`user-${user.authId}`, { expire: 0 });
      revalidatePath("/");
      revalidatePath("/diagnosis");

      return { success: true };
    } catch (error) {
      console.error(`Error recording consent: ${error}`);
      return { error: "Failed to record your consent. Please try again." };
    }
  });
