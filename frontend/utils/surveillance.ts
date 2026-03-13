"use server";

import type { OutbreakSummary, OutbreakFullResult } from "@/types";
import { getBackendUrl } from "@/utils/backend-url";

const BACKEND_URL = getBackendUrl();

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

export const getOutbreakData = async (
  contamination: number = 0.05,
  disease?: string,
  startDate?: string,
  endDate?: string,
): Promise<OutbreakFullResult> => {
  const params = new URLSearchParams({
    contamination: String(contamination),
  });

  if (disease && disease !== "all") params.set("disease", disease);
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);

  const url = `${BACKEND_URL}/api/surveillance/outbreaks?${params.toString()}`;

  console.log(`Fetching outbreak data from: ${url}`);

  const res = await fetch(url, {
    cache: "no-store",
  });

  if (!res.ok) {
    const errorBody = await res.text();

    console.error(
      `Failed to fetch outbreak data. Status: ${res.status}. Body: ${errorBody}`,
    );

    throw new Error(`Failed to fetch outbreak data: ${res.statusText}`);
  }

  return res.json();
};
