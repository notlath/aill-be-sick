// Philippines Location Data
// Source: PSGC (Philippine Standard Geographic Code)

export interface Region {
  psgc: string;
  name: string;
}

export interface Province {
  psgc: string;
  name: string;
  regionPsgc: string;
  geoLevel: string | null;
}

export interface Municipality {
  psgc: string;
  name: string;
  provincePsgc: string;
  regionPsgc: string;
  geoLevel: string;
}

export interface Barangay {
  psgc: string;
  name: string;
  municipalityPsgc: string;
  provincePsgc: string;
  regionPsgc: string;
}

// Raw location data
import regionsData from "@/public/locations/regions.json";
import provincesData from "@/public/locations/provinces.json";
import municipalitiesData from "@/public/locations/municipalities.json";
import barangaysData from "@/public/locations/barangays.json";

export const REGIONS = regionsData as Region[];
export const PROVINCES = provincesData as Province[];
export const MUNICIPALITIES = municipalitiesData as Municipality[];
export const BARANGAYS = barangaysData as Barangay[];

// Helper functions to filter locations by parent
export function getProvincesByRegion(regionName: string): Province[] {
  // First find the region by name to get its PSGC
  const region = REGIONS.find((r) => r.name === regionName);
  if (!region) return [];

  // Include both provinces and districts (for NCR)
  return PROVINCES.filter(
    (province) =>
      province.regionPsgc === region.psgc &&
      (province.geoLevel === "Prov" || province.geoLevel === "Dist"),
  );
}

export function getMunicipalitiesByProvince(
  provinceName: string,
): Municipality[] {
  // First find the province by name to get its PSGC
  const province = PROVINCES.find((p) => p.name === provinceName);
  if (!province) return [];

  return MUNICIPALITIES.filter(
    (municipality) => municipality.provincePsgc === province.psgc,
  );
}

export function getBarangaysByMunicipality(
  municipalityName: string,
): Barangay[] {
  // First find the municipality by name to get its PSGC
  const municipality = MUNICIPALITIES.find((m) => m.name === municipalityName);
  if (!municipality) return [];

  return BARANGAYS.filter(
    (barangay) => barangay.municipalityPsgc === municipality.psgc,
  );
}

// Helper to get region name by PSGC
export function getRegionName(regionPsgc: string): string | undefined {
  return REGIONS.find((r) => r.psgc === regionPsgc)?.name;
}

// Helper to get province name by PSGC
export function getProvinceName(provincePsgc: string): string | undefined {
  return PROVINCES.find((p) => p.psgc === provincePsgc)?.name;
}

// Helper to get municipality name by PSGC
export function getMunicipalityName(
  municipalityPsgc: string,
): string | undefined {
  return MUNICIPALITIES.find((m) => m.psgc === municipalityPsgc)?.name;
}

// Helper to get barangay name by PSGC
export function getBarangayName(barangayPsgc: string): string | undefined {
  return BARANGAYS.find((b) => b.psgc === barangayPsgc)?.name;
}

// Helper to get region PSGC by name
export function getRegionPsgcByName(name: string): string | undefined {
  return REGIONS.find((r) => r.name === name)?.psgc;
}

// Helper to get province PSGC by name
export function getProvincePsgcByName(name: string): string | undefined {
  return PROVINCES.find((p) => p.name === name)?.psgc;
}

// Helper to get municipality PSGC by name
export function getMunicipalityPsgcByName(name: string): string | undefined {
  return MUNICIPALITIES.find((m) => m.name === name)?.psgc;
}

// Helper to get barangay PSGC by name
export function getBarangayPsgcByName(name: string): string | undefined {
  return BARANGAYS.find((b) => b.name === name)?.psgc;
}

// NEW: Get all municipalities (cities) - for Option 2 implementation
export function getAllMunicipalities(): Municipality[] {
  return MUNICIPALITIES;
}

// Helper to prettify province/district labels for UI display
export function getProvinceDisplayName(name: string): string {
  return name.replace(/\s*\(Not a Province\)$/i, "");
}

// NEW: Get city display name with region and province
export function getCityDisplayName(municipalityName: string): string {
  const municipality = MUNICIPALITIES.find((m) => m.name === municipalityName);
  if (!municipality) return municipalityName;

  const region = REGIONS.find((r) => r.psgc === municipality.regionPsgc);
  const province = PROVINCES.find((p) => p.psgc === municipality.provincePsgc);

  if (!region || !province) return municipalityName;

  return `${municipalityName} (${region.name}, ${getProvinceDisplayName(province.name)})`;
}

// NEW: Get location hierarchy from barangay
export function getLocationFromBarangay(
  barangayName: string,
  cityName: string,
): {
  region: string;
  province: string;
  district?: string;
  city: string;
  barangay: string;
} | null {
  // Find the municipality first to narrow down barangays
  const municipality = MUNICIPALITIES.find((m) => m.name === cityName);
  if (!municipality) return null;

  // Find the specific barangay within that municipality
  const barangay = BARANGAYS.find(
    (b) => b.name === barangayName && b.municipalityPsgc === municipality.psgc,
  );
  if (!barangay) return null;

  const region = REGIONS.find((r) => r.psgc === barangay.regionPsgc);

  // For province/district: use the municipality's provincePsgc to get the correct province/district
  // This handles cases where barangays have incorrect provincePsgc
  let provinceOrDistrict = PROVINCES.find(
    (p) => p.psgc === municipality.provincePsgc,
  );
  let provinceName = provinceOrDistrict?.name;

  // If still not found, try the barangay's provincePsgc
  if (!provinceName) {
    provinceOrDistrict = PROVINCES.find(
      (p) => p.psgc === barangay.provincePsgc,
    );
    provinceName = provinceOrDistrict?.name;
  }

  // If province/district is still not found, it might be a city acting as province
  if (!provinceName) {
    const municipalityAsProvince = MUNICIPALITIES.find(
      (m) => m.psgc === barangay.provincePsgc,
    );
    if (municipalityAsProvince) {
      provinceName = municipalityAsProvince.name;
    }
  }

  if (!region || !provinceName) return null;

  return {
    region: region.name,
    province: provinceName,
    district:
      provinceOrDistrict?.geoLevel === "Dist" ? provinceName : undefined, // Mark as district if applicable
    city: cityName,
    barangay: barangayName,
  };
}
