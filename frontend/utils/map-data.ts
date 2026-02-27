"use server";

import prisma from "@/prisma/prisma";
import barangays from "@/public/locations/barangays.json";
import municipalities from "@/public/locations/municipalities.json";
import provinces from "@/public/locations/provinces.json";

export type LocationCaseCount = {
  location: string;
  count: number;
  latitude?: number;
  longitude?: number;
};

export type BarangayProvinceCaseCount = {
  barangay: string;
  barangayPsgc: string;
  municipality: string;
  municipalityPsgc: string;
  province: string;
  provincePsgc: string;
  count: number;
};

export type DiseaseMapData = {
  totalPatients: number;
  byCity: LocationCaseCount[];
  byRegion: LocationCaseCount[];
  byProvince: LocationCaseCount[];
  byBarangay: LocationCaseCount[];
  byBarangayWithProvince: BarangayProvinceCaseCount[];
  byDisease: Record<string, LocationCaseCount[]>;
};

type BarangayRecord = {
  psgc: string;
  name: string;
  municipalityPsgc: string;
  provincePsgc: string;
  regionPsgc: string;
};

type MunicipalityRecord = {
  psgc: string;
  name: string;
  provincePsgc: string;
  regionPsgc: string;
  geoLevel: string;
};

type ProvinceRecord = {
  psgc: string;
  name: string;
  regionPsgc: string;
  geoLevel: string;
};

const normalizeLoc = (value?: string | null): string => {
  if (!value) return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^province of\s+/i, "")
    .replace(/\s+province$/i, "")
    .replace(/^city of\s+/i, "")
    .replace(/\s+city$/i, "")
    .replace(/\s+municipality$/i, "")
    .replace(/\s+municipal(ity)?$/i, "");
};

const barangayRows = barangays as BarangayRecord[];
const municipalityRows = municipalities as MunicipalityRecord[];
const provinceRows = provinces as ProvinceRecord[];

const municipalityNameByPsgc = new Map<string, string>();
const provinceNameByPsgc = new Map<string, string>();
const provincePsgcByNormalizedName = new Map<string, string>();
const municipalityNameSetByProvincePsgc = new Map<string, Set<string>>();
const barangayIndex = new Map<string, BarangayRecord>();
const barangayByPsgc = new Map<string, BarangayRecord>();
const barangayCandidatesByProvinceAndName = new Map<string, BarangayRecord[]>();

provinceRows.forEach((province) => {
  provinceNameByPsgc.set(province.psgc, province.name);
  provincePsgcByNormalizedName.set(normalizeLoc(province.name), province.psgc);
});

municipalityRows.forEach((municipality) => {
  municipalityNameByPsgc.set(municipality.psgc, municipality.name);
  const current = municipalityNameSetByProvincePsgc.get(municipality.provincePsgc);
  if (current) {
    current.add(normalizeLoc(municipality.name));
  } else {
    municipalityNameSetByProvincePsgc.set(
      municipality.provincePsgc,
      new Set([normalizeLoc(municipality.name)]),
    );
  }
});

barangayRows.forEach((row) => {
  barangayByPsgc.set(row.psgc, row);
  const municipalityName = municipalityNameByPsgc.get(row.municipalityPsgc);
  const provinceName = provinceNameByPsgc.get(row.provincePsgc);
  if (!municipalityName || !provinceName) return;

  const key = [
    normalizeLoc(provinceName),
    normalizeLoc(municipalityName),
    normalizeLoc(row.name),
  ].join("||");
  barangayIndex.set(key, row);

  const looseKey = [normalizeLoc(provinceName), normalizeLoc(row.name)].join("||");
  const existing = barangayCandidatesByProvinceAndName.get(looseKey);
  if (existing) {
    existing.push(row);
  } else {
    barangayCandidatesByProvinceAndName.set(looseKey, [row]);
  }
});

/**
 * Aggregate patient data by location for map visualization
 * Fetches from User table to match dashboard patient count (all registered patients with location)
 * Optionally filters by disease using the latest diagnosis for each patient
 */
export const getMapDiseaseData = async ({
  disease,
  province,
  startDate,
  endDate,
}: {
  disease?: string;
  province?: string;
  startDate?: Date;
  endDate?: Date;
} = {}): Promise<{ success?: DiseaseMapData; error?: string }> => {
  try {
    // Map display disease names to Prisma enum keys
    // The enum uses @map("Dengue") so we need to convert "Dengue" -> "DENGUE"
    const diseaseToEnum: Record<string, string> = {
      "Dengue": "DENGUE",
      "Pneumonia": "PNEUMONIA",
      "Typhoid": "TYPHOID",
      "Diarrhea": "DIARRHEA",
      "Measles": "MEASLES",
      "Impetigo": "IMPETIGO",
      "Influenza": "INFLUENZA",
    };
    
    const diseaseEnumKey = disease ? diseaseToEnum[disease] : undefined;

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
    if (province) {
      userWhereClause.province = {
        equals: province,
        mode: "insensitive",
      };
    }

    // If filtering by disease, we need to fetch users with that disease diagnosis
    let users: any[] = [];

    if (diseaseEnumKey) {
      // Fetch users who have at least one diagnosis of the selected disease
      users = await prisma.user.findMany({
        where: userWhereClause,
        select: {
          id: true,
          city: true,
          province: true,
          region: true,
          barangay: true,
          diagnoses: {
            where: {
              disease: diseaseEnumKey as any, // Cast to any to handle enum
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
          barangay: true,
        },
      });
    }

    // Aggregate by location
    const cityCount = new Map<string, number>();
    const provinceCount = new Map<string, number>();
    const regionCount = new Map<string, number>();
    const barangayCount = new Map<string, number>();
    const barangayWithProvinceCount = new Map<string, number>();
    const diseaseLocationMap = new Map<string, Map<string, number>>();

    users.forEach((user) => {
      const city = user.city?.trim() || null;
      const province = user.province?.trim() || null;
      const region = user.region?.trim() || null;
      const barangay = user.barangay?.trim() || null;

      // Track by barangay (most granular)
      if (barangay) {
        barangayCount.set(barangay, (barangayCount.get(barangay) || 0) + 1);
      }
      if (barangay && province) {
        const provinceKey = normalizeLoc(province);
        const barangayKey = normalizeLoc(barangay);
        const cityKey = normalizeLoc(city);
        const provincePsgc = provincePsgcByNormalizedName.get(provinceKey);
        const municipalitySet = provincePsgc
          ? municipalityNameSetByProvincePsgc.get(provincePsgc)
          : null;

        let resolvedMunicipalityName: string | null = city;
        if (
          resolvedMunicipalityName &&
          municipalitySet &&
          !municipalitySet.has(cityKey)
        ) {
          resolvedMunicipalityName = null;
        }

        const lookupKey =
          resolvedMunicipalityName && normalizeLoc(resolvedMunicipalityName)
            ? [provinceKey, normalizeLoc(resolvedMunicipalityName), barangayKey].join(
                "||",
              )
            : null;

        let resolvedRow: BarangayRecord | undefined;
        if (lookupKey) {
          resolvedRow = barangayIndex.get(lookupKey);
        }
        if (!resolvedRow) {
          const looseKey = [provinceKey, barangayKey].join("||");
          const candidates =
            barangayCandidatesByProvinceAndName.get(looseKey) || [];
          if (candidates.length === 1) {
            resolvedRow = candidates[0];
          }
        }
        if (resolvedRow) {
          barangayWithProvinceCount.set(
            resolvedRow.psgc,
            (barangayWithProvinceCount.get(resolvedRow.psgc) || 0) + 1,
          );
        }
      }

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
      if (diseaseEnumKey) {
        // use the most granular location available
        const location = barangay || city || province || region || "Unknown";
        if (!diseaseLocationMap.has(diseaseEnumKey)) {
          diseaseLocationMap.set(diseaseEnumKey, new Map());
        }
        diseaseLocationMap
          .get(diseaseEnumKey)!
          .set(location, (diseaseLocationMap.get(diseaseEnumKey)!.get(location) || 0) + 1);
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

    const byBarangay: LocationCaseCount[] = Array.from(barangayCount.entries())
      .map(([location, count]) => ({
        location,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const byBarangayWithProvince: BarangayProvinceCaseCount[] = Array.from(
      barangayWithProvinceCount.entries(),
    )
      .map(([key, count]) => {
        const resolved = barangayByPsgc.get(key);
        if (!resolved) {
          return {
            province: "Unknown",
            provincePsgc: "",
            municipality: "Unknown",
            municipalityPsgc: "",
            barangay: "Unknown",
            barangayPsgc: key,
            count,
          };
        }
        const provinceName = provinceNameByPsgc.get(resolved.provincePsgc) || "Unknown";
        const municipalityName =
          municipalityNameByPsgc.get(resolved.municipalityPsgc) || "Unknown";
        return {
          province: provinceName,
          provincePsgc: resolved.provincePsgc,
          municipality: municipalityName,
          municipalityPsgc: resolved.municipalityPsgc,
          barangay: resolved.name,
          barangayPsgc: resolved.psgc,
          count,
        };
      })
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
        byBarangay,
        byBarangayWithProvince,
        byDisease,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[MAP ERROR] Failed to fetch map disease data:", errorMessage, error);
    return { error: `Failed to fetch map disease data: ${errorMessage}` };
  }
};
