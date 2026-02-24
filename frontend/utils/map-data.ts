"use server";

import prisma from "@/prisma/prisma";

export type LocationCaseCount = {
  location: string;
  count: number;
  latitude?: number;
  longitude?: number;
};

export type DiseaseMapData = {
  totalPatients: number;
  byCity: LocationCaseCount[];
  byRegion: LocationCaseCount[];
  byProvince: LocationCaseCount[];
  byDisease: Record<string, LocationCaseCount[]>;
};

/**
 * Aggregate patient data by location for map visualization
 * Fetches from User table to match dashboard patient count (all registered patients with location)
 * Optionally filters by disease using the latest diagnosis for each patient
 */
export const getMapDiseaseData = async ({
  disease,
  startDate,
  endDate,
}: {
  disease?: string;
  startDate?: Date;
  endDate?: Date;
} = {}): Promise<{ success?: DiseaseMapData; error?: string }> => {
  try {
    // Convert disease name to enum value (e.g., "Dengue" -> "DENGUE")
    const diseaseEnum = disease ? (disease.toUpperCase() as any) : undefined;

    // Build the filter for users with location data
    // Match the backend's requirement: latitude, longitude, city/region, age, and gender
    const userWhereClause: any = {
      role: "PATIENT",
      latitude: { not: null },
      longitude: { not: null },
      age: { not: null },
      gender: { not: null },
      OR: [
        { city: { not: null } },
        { province: { not: null } },
        { region: { not: null } },
      ],
    };

    // If filtering by disease, we need to fetch users with that disease diagnosis
    let users: any[] = [];

    if (diseaseEnum) {
      // Fetch users who have at least one diagnosis of the selected disease
      users = await prisma.user.findMany({
        where: userWhereClause,
        select: {
          id: true,
          city: true,
          province: true,
          region: true,
          diagnoses: {
            where: {
              disease: diseaseEnum,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      // Filter to only include users who have the disease diagnosis
      users = users.filter((u) => u.diagnoses && u.diagnoses.length > 0);

    } else {
      // Fetch all patients with location data (matches dashboard count)
      users = await prisma.user.findMany({
        where: userWhereClause,
        select: {
          id: true,
          city: true,
          province: true,
          region: true,
        },
      });
    }

    // Aggregate by location
    const cityCount = new Map<string, number>();
    const provinceCount = new Map<string, number>();
    const regionCount = new Map<string, number>();
    const diseaseLocationMap = new Map<string, Map<string, number>>();

    users.forEach((user) => {
      const city = user.city?.trim() || null;
      const province = user.province?.trim() || null;
      const region = user.region?.trim() || null;

      // Track by city
      if (city) {
        cityCount.set(city, (cityCount.get(city) || 0) + 1);
      }

      // Track by province
      if (province) {
        provinceCount.set(province, (provinceCount.get(province) || 0) + 1);
      }

      // Track by region
      if (region) {
        regionCount.set(region, (regionCount.get(region) || 0) + 1);
      }

      // Track by disease (for byDisease aggregation when filtering)
      if (diseaseEnum) {
        // use the most granular location available
        const location = city || province || region || "Unknown";
        if (!diseaseLocationMap.has(diseaseEnum)) {
          diseaseLocationMap.set(diseaseEnum, new Map());
        }
        diseaseLocationMap
          .get(diseaseEnum)!
          .set(location, (diseaseLocationMap.get(diseaseEnum)!.get(location) || 0) + 1);
      }
    });

    // Convert to arrays
    const byCity: LocationCaseCount[] = Array.from(cityCount.entries())
      .map(([location, count]) => ({
        location,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const byProvince: LocationCaseCount[] = Array.from(provinceCount.entries())
      .map(([location, count]) => ({
        location,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const byRegion: LocationCaseCount[] = Array.from(regionCount.entries())
      .map(([location, count]) => ({
        location,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const byDisease: Record<string, LocationCaseCount[]> = {};
    diseaseLocationMap.forEach((locationMap, dis) => {
      byDisease[dis] = Array.from(locationMap.entries())
        .map(([location, count]) => ({
          location,
          count,
        }))
        .sort((a, b) => b.count - a.count);
    });

    const totalPatients = users.length;

    return {
      success: {
        totalPatients,
        byCity,
        byRegion,
        byProvince,
        byDisease,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[MAP ERROR] Failed to fetch map disease data:", errorMessage, error);
    return { error: `Failed to fetch map disease data: ${errorMessage}` };
  }
};
