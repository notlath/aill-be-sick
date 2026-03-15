import * as z from "zod";

/**
 * Schema for the auto-record path.
 * Only the message and chat identifiers are required — the action looks up all
 * other data from the TempDiagnosis record and the authenticated user's profile.
 * GPS coordinates are optional because the browser prompt may not have fired yet.
 */
export const AutoRecordDiagnosisSchema = z.object({
  messageId: z.number().min(1, "Message ID cannot be empty"),
  chatId: z.string().min(1, "Chat ID cannot be empty"),
});

export type AutoRecordDiagnosisInput = z.infer<typeof AutoRecordDiagnosisSchema>;
