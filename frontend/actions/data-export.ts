"use server";

import { DataExportSchema } from "@/schemas/DataExportSchema";
import { getBackendUrl } from "@/utils/backend-url";
import { getCurrentDbUser } from "@/utils/user";
import axios, { AxiosError } from "axios";
import { actionClient } from "./client";

const BACKEND_URL = getBackendUrl();

export const dataExport = actionClient
  .inputSchema(DataExportSchema)
  .action(async ({ parsedInput }) => {
    const { format } = parsedInput;
    const { success: dbUser, error } = await getCurrentDbUser();

    if (!dbUser) {
      console.error(`Error fetching user: ${error}`);
      return { error: `Error fetching user: ${error}` };
    }

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/user/data-export`,
        { format },
        {
          headers: {
            "X-User-ID": dbUser.id.toString(),
            "Content-Type": "application/json",
          },
        },
      );

      const data = response.data;

      return {
        success: true,
        data,
        format,
      };
    } catch (error) {
      console.error("Error exporting data:", error);

      if (error instanceof AxiosError && error.response) {
        const errorData = error.response.data;
        return {
          error: errorData.error || "DATA_EXPORT_FAILED",
          message: errorData.message || "Failed to export data.",
        };
      }

      return { error: `Error exporting data: ${error}` };
    }
  });