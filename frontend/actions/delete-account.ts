"use server";

import { actionClient } from "./client";
import { DeleteAccountSchema } from "@/schemas/DeleteAccountSchema";
import { getBackendUrl } from "@/utils/backend-url";
import { getCurrentDbUser } from "@/utils/user";
import axios, { AxiosError } from "axios";

const BACKEND_URL = getBackendUrl();

export const deleteAccount = actionClient
  .inputSchema(DeleteAccountSchema)
  .action(async ({ parsedInput }) => {
    const { password } = parsedInput;
    const { success: dbUser, error } = await getCurrentDbUser();

    if (!dbUser) {
      console.error(`Error fetching user: ${error}`);
      return { error: `Authentication required: ${error}` };
    }

    try {
      const response = await axios.delete(
        `${BACKEND_URL}/api/user/account`,
        {
          withCredentials: true,
          headers: {
            "X-User-ID": dbUser.id.toString(),
          },
          data: { password },
        }
      );

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