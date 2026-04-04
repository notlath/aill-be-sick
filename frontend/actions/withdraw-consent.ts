"use server";

import { actionClient } from "./client";
import { getBackendUrl } from "@/utils/backend-url";
import { getCurrentDbUser } from "@/utils/user";
import { createClient } from "@/utils/supabase/server";
import axios, { AxiosError } from "axios";
import { revalidatePath, revalidateTag } from "next/cache";

const BACKEND_URL = getBackendUrl();

export const withdrawConsent = actionClient.action(async () => {
  const { success: dbUser, error } = await getCurrentDbUser();

  if (!dbUser) {
    console.error(`Error fetching user: ${error}`);
    return { error: `Authentication required: ${error}` };
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { error: "Authentication required: No active session" };
  }

  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/user/withdraw-consent`,
      {},
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Revalidate user data and main paths
    revalidateTag(`user-${dbUser.authId}`, { expire: 0 });
    revalidatePath("/");
    revalidatePath("/diagnosis");
    revalidatePath("/profile");

    return {
      success: {
        message: response.data.message || "Consent withdrawn successfully",
      },
    };
  } catch (error) {
    console.error("Error withdrawing consent:", error);

    if (error instanceof AxiosError && error.response) {
      const errorData = error.response.data;

      return {
        error: errorData.error || "Failed to withdraw consent",
        message: errorData.message || "An error occurred while withdrawing your consent",
      };
    }

    return { error: "Failed to withdraw consent. Please try again." };
  }
});