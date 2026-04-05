import type { SearchBoxRetrieveResponse } from "@mapbox/search-js-core";

export const ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export const FIXED_CITY = "Quezon City";
export const FIXED_BARANGAY = "Bagong Silangan";
export const FIXED_REGION = "National Capital Region (NCR)";
export const FIXED_PROVINCE = "NCR, Second District";

export interface MapboxAddressResult {
  address: string;
  lat: number;
  lng: number;
  feature: GeoJSON.Feature<GeoJSON.Point>;
}

export function parseMapboxResponse(
  response: SearchBoxRetrieveResponse,
): MapboxAddressResult | null {
  const feature = response?.features?.[0];
  if (!feature) return null;

  const address: string =
    feature.properties.full_address ||
    feature.properties.place_formatted ||
    feature.properties.name ||
    "";
  const lng: number = feature.geometry.coordinates[0];
  const lat: number = feature.geometry.coordinates[1];

  return {
    address,
    lat,
    lng,
    feature: feature as GeoJSON.Feature<GeoJSON.Point>,
  };
}
