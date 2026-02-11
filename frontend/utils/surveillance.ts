'use server'

import type { OutbreakSummary } from "@/types";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:10000";

export const getOutbreakSummary = async (
  contamination: number = 0.05,
): Promise<OutbreakSummary> => {
  const url = `${BACKEND_URL}/api/surveillance/outbreaks?summary=true&contamination=${contamination}`;

  console.log(`Fetching outbreak summary from: ${url}`);

  const res = await fetch(url, {
    cache: "no-store",
  });

  if (!res.ok) {
    const errorBody = await res.text();

    console.error(
      `Failed to fetch outbreak summary. Status: ${res.status}. Body: ${errorBody}`,
    );

    throw new Error(`Failed to fetch outbreak data: ${res.statusText}`);
  }

  return res.json();
};
