"use server";

import { DataExportSchema } from "@/schemas/DataExportSchema";
import { getBackendUrl } from "@/utils/backend-url";
import { getCurrentDbUser } from "@/utils/user";
import { createClient } from "@/utils/supabase/server";
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

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { error: "Authentication required: No active session" };
    }

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/user/data-export`,
        { format },
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = response.data;

      const payloadSize = JSON.stringify(data).length;
      const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024;

      if (payloadSize > MAX_PAYLOAD_SIZE) {
        return {
          error: "EXPORT_TOO_LARGE",
          message: "Your data export is too large for direct download. Please contact support.",
        };
      }

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