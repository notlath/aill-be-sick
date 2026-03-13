"use server";

import type { PatientClusterData, IllnessClusterData } from "@/types";
import { getBackendUrl } from "@/utils/backend-url";

const BACKEND_URL = getBackendUrl();

export const getPatientClusters = async (
  k: number,
): Promise<PatientClusterData> => {
  const url = `${BACKEND_URL}/api/patient-clusters?n_clusters=${k}`;

  console.log(`Fetching patient clusters from: ${url}`);

  const res = await fetch(url, {
    cache: "no-store", // Since dynamic data na dependent kay `k`
  });

  if (!res.ok) {
    const errorBody = await res.text();

    console.error(
      `Failed to fetch cluster data. Status: ${res.status}. Body: ${errorBody}`,
    );

    throw new Error(`Failed to fetch cluster data: ${res.statusText}`);
  }

  return res.json();
};

export const getIllnessClusters = async (
  k: number,
): Promise<IllnessClusterData | null> => {
  const url = `${BACKEND_URL}/api/illness-clusters?n_clusters=${k}`;

  console.log(`Fetching illness clusters from: ${url}`);

  try {
    const res = await fetch(url, {
      cache: "no-store",
    });

    if (!res.ok) {
      const errorBody = await res.text();

      console.error(
        `Failed to fetch illness cluster data. Status: ${res.status}. Body: ${errorBody}`,
      );

      return null;
    }

    return res.json();
  } catch (error) {
    console.error(`Error fetching illness cluster data: ${error}`);
    return null;
  }
};
