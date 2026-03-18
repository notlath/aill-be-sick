import { LEGAL_CONSTANTS } from "@/constants/legal";
import { User } from "@/lib/generated/prisma";

/**
 * Check if a user needs to accept or re-accept the terms and privacy policy.
 *
 * Returns true if:
 * - User has never accepted terms (termsAcceptedAt is null)
 * - User has never accepted privacy policy (privacyAcceptedAt is null)
 * - User's accepted terms version doesn't match current version
 * - User's accepted privacy version doesn't match current version
 *
 * @param user - The user object from the database
 * @returns boolean - true if user needs to accept/re-accept terms
 */
export function needsTermsUpdate(user: User): boolean {
  // Check if user has never accepted terms or privacy
  if (!user.termsAcceptedAt || !user.privacyAcceptedAt) {
    return true;
  }

  // Check if terms version has been updated
  if (user.termsVersion !== LEGAL_CONSTANTS.TERMS_VERSION) {
    return true;
  }

  // Check if privacy version has been updated
  if (user.privacyVersion !== LEGAL_CONSTANTS.PRIVACY_VERSION) {
    return true;
  }

  return false;
}

/**
 * Get information about what the user needs to update.
 * Useful for displaying specific messages about why they need to re-accept.
 *
 * @param user - The user object from the database
 * @returns Object with details about what needs to be updated
 */
export function getTermsUpdateInfo(user: User): {
  needsUpdate: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (!user.termsAcceptedAt) {
    reasons.push("You have not yet accepted the Terms of Service.");
  } else if (user.termsVersion !== LEGAL_CONSTANTS.TERMS_VERSION) {
    reasons.push(
      `The Terms of Service have been updated to version ${LEGAL_CONSTANTS.TERMS_VERSION}.`
    );
  }

  if (!user.privacyAcceptedAt) {
    reasons.push("You have not yet accepted the Privacy Policy.");
  } else if (user.privacyVersion !== LEGAL_CONSTANTS.PRIVACY_VERSION) {
    reasons.push(
      `The Privacy Policy has been updated to version ${LEGAL_CONSTANTS.PRIVACY_VERSION}.`
    );
  }

  return {
    needsUpdate: reasons.length > 0,
    reasons,
  };
}
