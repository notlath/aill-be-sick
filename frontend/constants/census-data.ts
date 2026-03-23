import { BAGONG_SILANGAN_DISTRICTS } from "./bagong-silangan-districts";

export interface DemographicIndicators {
  povertyIncidence: number; // percentage (0-1)
  waterAccess: number; // percentage (0-1)
  sanitationAccess: number; // percentage (0-1)
}

export interface BarangayCensusData {
  psgcCode: string;
  barangayName: string;
  zone: string;
  populationTotal: number;
  populationDensityPerHectare: number;
  indicators: DemographicIndicators;
}

// Mock data structured to easily swap with PSA data in the future
export const MOCK_CENSUS_DATA: BarangayCensusData[] = [
  {
    psgcCode: "137404015",
    barangayName: "Bagong Silangan",
    zone: "Agri Land",
    populationTotal: 3450,
    populationDensityPerHectare: 45.2,
    indicators: { povertyIncidence: 0.28, waterAccess: 0.85, sanitationAccess: 0.82 },
  },
  {
    psgcCode: "137404015",
    barangayName: "Bagong Silangan",
    zone: "Barangay Proper",
    populationTotal: 18500,
    populationDensityPerHectare: 210.5,
    indicators: { povertyIncidence: 0.35, waterAccess: 0.78, sanitationAccess: 0.71 },
  },
  {
    psgcCode: "137404015",
    barangayName: "Bagong Silangan",
    zone: "Covenant Village",
    populationTotal: 4200,
    populationDensityPerHectare: 85.3,
    indicators: { povertyIncidence: 0.15, waterAccess: 0.95, sanitationAccess: 0.92 },
  },
  {
    psgcCode: "137404015",
    barangayName: "Bagong Silangan",
    zone: "DSWD",
    populationTotal: 1200,
    populationDensityPerHectare: 65.1,
    indicators: { povertyIncidence: 0.42, waterAccess: 0.75, sanitationAccess: 0.65 },
  },
  {
    psgcCode: "137404015",
    barangayName: "Bagong Silangan",
    zone: "Filinvest 2",
    populationTotal: 6800,
    populationDensityPerHectare: 40.8,
    indicators: { povertyIncidence: 0.05, waterAccess: 0.99, sanitationAccess: 0.98 },
  },
  {
    psgcCode: "137404015",
    barangayName: "Bagong Silangan",
    zone: "Filinvest Heights - Brookside",
    populationTotal: 5400,
    populationDensityPerHectare: 38.5,
    indicators: { povertyIncidence: 0.08, waterAccess: 0.98, sanitationAccess: 0.96 },
  },
  {
    psgcCode: "137404015",
    barangayName: "Bagong Silangan",
    zone: "Parkwoods",
    populationTotal: 3200,
    populationDensityPerHectare: 35.2,
    indicators: { povertyIncidence: 0.12, waterAccess: 0.96, sanitationAccess: 0.95 },
  },
  {
    psgcCode: "137404015",
    barangayName: "Bagong Silangan",
    zone: "Sitio Bakal",
    populationTotal: 8900,
    populationDensityPerHectare: 185.6,
    indicators: { povertyIncidence: 0.45, waterAccess: 0.65, sanitationAccess: 0.60 },
  },
  {
    psgcCode: "137404015",
    barangayName: "Bagong Silangan",
    zone: "Sitio Veterans",
    populationTotal: 12400,
    populationDensityPerHectare: 205.4,
    indicators: { povertyIncidence: 0.38, waterAccess: 0.72, sanitationAccess: 0.68 },
  },
  {
    psgcCode: "137404015",
    barangayName: "Bagong Silangan",
    zone: "Spring Valley",
    populationTotal: 4600,
    populationDensityPerHectare: 95.8,
    indicators: { povertyIncidence: 0.22, waterAccess: 0.88, sanitationAccess: 0.85 },
  },
  {
    psgcCode: "137404015",
    barangayName: "Bagong Silangan",
    zone: "Sugartowne",
    populationTotal: 5100,
    populationDensityPerHectare: 110.2,
    indicators: { povertyIncidence: 0.25, waterAccess: 0.86, sanitationAccess: 0.82 },
  },
  {
    psgcCode: "137404015",
    barangayName: "Bagong Silangan",
    zone: "Violago Homes",
    populationTotal: 7200,
    populationDensityPerHectare: 125.5,
    indicators: { povertyIncidence: 0.18, waterAccess: 0.92, sanitationAccess: 0.88 },
  },
];

export function getCensusDataByZone(zoneName: string): BarangayCensusData | undefined {
  return MOCK_CENSUS_DATA.find((data) => data.zone === zoneName);
}

export function getTotalPopulation(): number {
  return MOCK_CENSUS_DATA.reduce((sum, data) => sum + data.populationTotal, 0);
}

/**
 * Calculates disease incidence rate per 1,000 population
 */
export function calculateIncidenceRate(caseCount: number, population: number): number {
  if (!population || population === 0) return 0;
  return (caseCount / population) * 1000;
}
