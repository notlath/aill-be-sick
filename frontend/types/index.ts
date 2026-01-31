export type TempDiagnosis = {
  confidence: number;
  uncertainty: number;
  modelUsed: string;
  disease: string;
  chatId: string;
};

export type Explanation = {
  tokens: string[];
  importances: number[];
};

// Types for patient clustering data
export interface Patient {
  id: number;
  name: string;
  email: string;
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  age: number;
  cluster: number;
  disease?: string | null;
}

export interface GenderDistribution {
  MALE: number;
  FEMALE: number;
  OTHER: number;
}

export interface RegionCount {
  region: string;
  count: number;
}

export interface CityCount {
  city: string;
  count: number;
}

export interface ClusterStatistics {
  cluster_id: number;
  count: number;
  avg_age: number;
  gender_distribution: GenderDistribution;
  top_regions: RegionCount[];
  top_cities: CityCount[];
  disease_distribution?: Record<string, { count: number; percent: number }>;
  top_diseases?: { disease: string; count: number }[];
}

export interface PatientClusterData {
  n_clusters: number;
  total_patients: number;
  cluster_statistics: ClusterStatistics[];
  patients: Patient[];
  centers: number[][];
}
