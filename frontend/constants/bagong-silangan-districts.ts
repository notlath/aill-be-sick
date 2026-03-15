// Sub-barangays / districts of Bagong Silangan, Quezon City
// Source: bagong_silangan.geojson

export interface BagongSilanganDistrict {
  name: string;
  geoLevel: string;
  centroid?: { lat: number; lng: number };
}

export const BAGONG_SILANGAN_DISTRICTS: BagongSilanganDistrict[] = [
  { name: "Agri Land", geoLevel: "zone", centroid: { lat: 14.71734, lng: 121.11863 } },
  { name: "Barangay Proper", geoLevel: "zone", centroid: { lat: 14.69738, lng: 121.10735 } },
  { name: "Covenant Village", geoLevel: "zone", centroid: { lat: 14.69626, lng: 121.10772 } },
  { name: "DSWD", geoLevel: "zone", centroid: { lat: 14.69387, lng: 121.09898 } },
  { name: "Filinvest 2", geoLevel: "zone", centroid: { lat: 14.69910, lng: 121.10303 } },
  { name: "Filinvest Heights - Brookside", geoLevel: "zone", centroid: { lat: 14.70045, lng: 121.11360 } },
  { name: "Parkwoods", geoLevel: "zone", centroid: { lat: 14.72546, lng: 121.11707 } },
  { name: "Sitio Bakal", geoLevel: "zone", centroid: { lat: 14.70953, lng: 121.11937 } },
  { name: "Sitio Veterans", geoLevel: "zone", centroid: { lat: 14.70620, lng: 121.10741 } },
  { name: "Spring Valley", geoLevel: "zone", centroid: { lat: 14.70991, lng: 121.11001 } },
  { name: "Sugartowne", geoLevel: "zone", centroid: { lat: 14.69208, lng: 121.10089 } },
  { name: "Violago Homes", geoLevel: "zone", centroid: { lat: 14.69979, lng: 121.10046 } },
];

export function getDistrictCentroid(name: string) {
  return BAGONG_SILANGAN_DISTRICTS.find(d => d.name === name)?.centroid;
}
