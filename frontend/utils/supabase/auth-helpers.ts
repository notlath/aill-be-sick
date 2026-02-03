/**
 * Helper utilities for handling Supabase OAuth with PKCE
 *
 * This module provides utilities to work around PKCE code_verifier issues
 * by managing the OAuth flow explicitly.
 */

/**
 * Generate a random string for PKCE challenge
 */
export function generateRandomString(length: number = 43): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const charsetLength = charset.length;

  if (
    typeof crypto === "undefined" ||
    typeof crypto.getRandomValues !== "function"
  ) {
    throw new Error(
      "Secure random number generator (crypto.getRandomValues) is not available.",
    );
  }

  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = randomValues[i] % charsetLength;
    result += charset.charAt(randomIndex);
  }
  return result;
}

/**
 * SHA256 hash function for PKCE
 */
async function sha256(message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest("SHA-256", encoder.encode(message));
}

/**
 * Base64 URL encode without padding
 */
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Generate PKCE code challenge and verifier
 */
export async function generatePKCEChallenge(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const codeVerifier = generateRandomString(128);
  const codeVerifierHash = await sha256(codeVerifier);
  const codeChallenge = base64UrlEncode(codeVerifierHash);

  return {
    codeVerifier,
    codeChallenge,
  };
}

/**
 * Store code verifier in session storage for retrieval in callback
 */
export function storeCodeVerifier(codeVerifier: string): void {
  try {
    sessionStorage.setItem("oauth_code_verifier", codeVerifier);
  } catch (error) {
    console.error("Failed to store code verifier:", error);
  }
}

/**
 * Retrieve code verifier from session storage
 */
export function getStoredCodeVerifier(): string | null {
  try {
    return sessionStorage.getItem("oauth_code_verifier");
  } catch (error) {
    console.error("Failed to retrieve code verifier:", error);
    return null;
  }
}

/**
 * Clear stored code verifier
 */
export function clearStoredCodeVerifier(): void {
  try {
    sessionStorage.removeItem("oauth_code_verifier");
  } catch (error) {
    console.error("Failed to clear code verifier:", error);
  }
}
