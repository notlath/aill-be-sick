"use server";

import { actionClient } from "./client";
import { getBackendUrl } from "@/utils/backend-url";
import { getCurrentDbUser } from "@/utils/user";
import axios, { AxiosError } from "axios";
import { revalidatePath, revalidateTag } from "next/cache";

const BACKEND_URL = getBackendUrl();

export const withdrawConsent = actionClient.action(async () => {
  const { success: dbUser, error } = await getCurrentDbUser();

  if (!dbUser) {
    console.error(`Error fetching user: ${error}`);
    return { error: `Authentication required: ${error}` };
  }

  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/user/withdraw-consent`,
      {},
      {
        withCredentials: true,
        headers: {
          "X-User-ID": dbUser.id.toString(),
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