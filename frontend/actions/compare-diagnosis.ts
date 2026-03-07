"use server";

import { CompareDiagnosisSchema } from "@/schemas/CompareDiagnosisSchema";
import { getBackendUrl } from "@/utils/backend-url";
import axios from "axios";
import { actionClient } from "./client";

const BACKEND_URL = getBackendUrl();

export const compareDiagnosis = actionClient
  .inputSchema(CompareDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { symptoms } = parsedInput;

    try {
      const response = await axios.post(
        `${BACKEND_URL}/diagnosis/new`,
        {
          symptoms,
        },
        {
          withCredentials: true, // Enable session cookies
        },
      );

      const diagnosis = response.data.data;

      // BRIDGE: Capture session cookie from Flask and set it in Next.js response
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();

        // Parse the session cookie (usually named 'session')
        setCookieHeader.forEach((cookieStr) => {
          if (cookieStr.startsWith("session=")) {
            const sessionValue = cookieStr.split(";")[0].split("=")[1];
            // Set cookie in browser
            cookieStore.set("session", sessionValue, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
              maxAge: 60 * 60, // 1 hour match backend
            });
          }
        });
      }

      return {
        success: diagnosis,
      };
    } catch (error) {
      console.error("Error running diagnosis for comparison:", error);
      if (axios.isAxiosError(error) && error.response) {
        return { error: error.response.data };
      }
      return { error: `Error running diagnosis: ${error}` };
    }
  });
