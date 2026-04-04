/**
 * Check if a user has been anonymized based on their email pattern.
 * Anonymized users have emails like: deleted_123@anonymous.com
 */
export function isAnonymizedUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return /^deleted_\d+@anonymous\.com$/.test(email);
}
