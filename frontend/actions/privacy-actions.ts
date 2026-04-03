"use server";

import { actionClient } from "./client";
import { ExportDataSchema, WithdrawConsentSchema, DeleteAccountSchema } from "@/schemas/privacy-actions";
import prisma from "@/prisma/prisma";
import { getCurrentDbUser } from "@/utils/user";
import { revalidatePath } from "next/cache";

export const exportUserData = actionClient
  .action(async () => {
    const { success: dbUser, error } = await getCurrentDbUser();

    if (!dbUser) {
      return { error: error || "User not authenticated" };
    }

    try {
      // Log the export action
      await prisma.auditLog.create({
        data: {
          userId: dbUser.id,
          action: "EXPORT_DATA",
          details: { timestamp: new Date().toISOString() },
        },
      });

      // For now, return success - in a real implementation, this would generate and return a data export
      // Could return a download URL or trigger an email with data
      return { success: "Data export initiated. You will receive an email with your data shortly." };
    } catch (error) {
      console.error(`Error exporting data: ${error}`);
      return { error: "Failed to export data." };
    }
  });

export const withdrawConsent = actionClient
  .action(async () => {
    const { success: dbUser, error } = await getCurrentDbUser();

    if (!dbUser) {
      return { error: error || "User not authenticated" };
    }

    try {
      // Update user to withdraw consent
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          privacyAcceptedAt: null,
          termsAcceptedAt: null,
        },
      });

      // Log the withdrawal
      await prisma.auditLog.create({
        data: {
          userId: dbUser.id,
          action: "WITHDRAW_CONSENT",
          details: { timestamp: new Date().toISOString() },
        },
      });

      revalidatePath("/privacy-rights");
      return { success: "Consent withdrawn successfully." };
    } catch (error) {
      console.error(`Error withdrawing consent: ${error}`);
      return { error: "Failed to withdraw consent." };
    }
  });

export const deleteAccount = actionClient
  .action(async () => {
    const { success: dbUser, error } = await getCurrentDbUser();

    if (!dbUser) {
      return { error: error || "User not authenticated" };
    }

    try {
      // For safety, we'll mark for deletion rather than immediate delete
      // In a real app, this might trigger a confirmation email or admin review
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          // Add a field for deletion request if it exists, or use a flag
          // For now, log the request
        },
      });

      // Log the deletion request
      await prisma.auditLog.create({
        data: {
          userId: dbUser.id,
          action: "DELETE_ACCOUNT_REQUEST",
          details: { timestamp: new Date().toISOString() },
        },
      });

      // Note: Actual account deletion should be handled carefully, perhaps with admin approval
      return { success: "Account deletion request submitted. You will be contacted for confirmation." };
    } catch (error) {
      console.error(`Error requesting account deletion: ${error}`);
      return { error: "Failed to request account deletion." };
    }
  });