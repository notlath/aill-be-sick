import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a timestamp string returned by Supabase as a proper UTC Date.
 *
 * Supabase sometimes returns ISO strings without a timezone suffix
 * (e.g. "2026-03-15T13:52:31.000"), which JavaScript would incorrectly
 * interpret as local time. This helper ensures the string is always
 * treated as UTC by appending "Z" when no offset is present.
 */
export function parseUtcDate(timestamp: string): Date {
  const hasOffset = timestamp.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(timestamp);
  return new Date(hasOffset ? timestamp : timestamp + "Z");
}
