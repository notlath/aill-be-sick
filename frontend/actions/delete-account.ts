"use server";

import { actionClient } from "./client";
import { DeleteAccountSchema } from "@/schemas/DeleteAccountSchema";
import { getBackendUrl } from "@/utils/backend-url";
import { getCurrentDbUser } from "@/utils/user";
import { hasActiveDeletionSchedule } from "@/utils/check-deletion-schedule";
import { createClient } from "@/utils/supabase/server";
import axios, { AxiosError } from "axios";
import { revalidatePath, revalidateTag } from "next/cache";

const BACKEND_URL = getBackendUrl();

export const deleteAccount = actionClient
  .inputSchema(DeleteAccountSchema)
  .action(async ({ parsedInput }) => {
    const { success: dbUser, error } = await getCurrentDbUser();

    if (!dbUser) {
      console.error(`Error fetching user: ${error}`);
      return { error: `Authentication required: ${error}` };
    }

    if (dbUser.role === "PATIENT") {
      const hasSchedule = await hasActiveDeletionSchedule(dbUser.id);
      if (hasSchedule) {
        return { error: "Your account is scheduled for deletion. Please keep your account or exit to continue using the app." };
      }
    }

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { error: "Authentication required: No active session" };
    }

    try {
      const response = await axios.delete(
        `${BACKEND_URL}/api/user/account`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      revalidateTag(`user-${dbUser.authId}`, { expire: 0 });
      revalidatePath("/");
      revalidatePath("/diagnosis");
      revalidatePath("/profile");

      return {
        success: {
          message: response.data.message || "Account deleted successfully",
        },
      };
    } catch (error) {
      console.error("Error deleting account:", error);

      if (error instanceof AxiosError && error.response) {
        const errorData = error.response.data;

        return {
          error: errorData.error || "Failed to delete account",
          message: errorData.message || "An error occurred while deleting your account",
        };
      }

      return { error: "Failed to delete account. Please try again." };
    }
  });