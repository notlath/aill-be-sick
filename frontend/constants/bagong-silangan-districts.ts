// Sub-barangays / districts of Bagong Silangan, Quezon City
// Source: bagong_silangan.geojson

export interface BagongSilanganDistrict {
  name: string;
  geoLevel: string;
  centroid?: { lat: number; lng: number };
}

export const BAGONG_SILANGAN_DISTRICTS: BagongSilanganDistrict[] = [
  { name: "Agri Land", geoLevel: "zone", centroid: { lat: 14.70977, lng: 121.11989 } },
  { name: "Barangay Proper", geoLevel: "zone", centroid: { lat: 14.69782, lng: 121.10898 } },
  { name: "Covenant Village", geoLevel: "zone", centroid: { lat: 14.69581, lng: 121.10755 } },
  { name: "DSWD", geoLevel: "zone", centroid: { lat: 14.69385, lng: 121.09888 } },
  { name: "Filinvest 2", geoLevel: "zone", centroid: { lat: 14.69890, lng: 121.10295 } },
  { name: "Filinvest Heights - Brookside", geoLevel: "zone", centroid: { lat: 14.70059, lng: 121.11359 } },
  { name: "Parkwoods", geoLevel: "zone", centroid: { lat: 14.72564, lng: 121.11698 } },
  { name: "Sitio Bakal", geoLevel: "zone", centroid: { lat: 14.70970, lng: 121.11952 } },
  { name: "Sitio Veterans", geoLevel: "zone", centroid: { lat: 14.70639, lng: 121.10702 } },
  { name: "Spring Valley", geoLevel: "zone", centroid: { lat: 14.71017, lng: 121.10964 } },
  { name: "Sugartowne", geoLevel: "zone", centroid: { lat: 14.69211, lng: 121.10108 } },
  { name: "Violago Homes", geoLevel: "zone", centroid: { lat: 14.69983, lng: 121.10024 } },
];

export function getDistrictCentroid(name: string) {
  return BAGONG_SILANGAN_DISTRICTS.find(d => d.name === name)?.centroid;
}
