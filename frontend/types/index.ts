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
  province?: string | null;
  barangay?: string | null;
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
  min_age: number;
  max_age: number;
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

// Types for surveillance / outbreak detection
export interface SurveillanceAnomaly {
  id: number;
  disease: string;
  created_at: string;
  latitude: number;
  longitude: number;
  city: string | null;
  province: string | null;
  region: string | null;
  confidence: number;
  uncertainty: number;
  user_id: number;
  user_name: string;
  anomaly_score: number;
}

export interface OutbreakSummary {
  outbreak_alert: boolean;
  total_analyzed: number;
  anomaly_count: number;
  contamination: number;
  disease_breakdown: Record<string, number>;
  region_breakdown: Record<string, number>;
  top_anomalies: SurveillanceAnomaly[];
}

export interface OutbreakFullResult {
  anomalies: SurveillanceAnomaly[];
  normal: SurveillanceAnomaly[];
  total_analyzed: number;
  anomaly_count: number;
  outbreak_alert: boolean;
  contamination: number;
}

export type HeatmapLegendBin = {
  min: number;
  max: number;
  color: string;
};

export type MapHeatmapData = {
  clusterBaseColor: string;
  // Province-level counts for selected cluster (used in tooltip line 1)
  provinceCounts: Record<string, number>;
  // Region-projected province counts for heatmap fill intensity
  projectedProvinceCounts: Record<string, number>;
  // Province totals for selected cluster
  provinceTotals: Record<string, number>;
  // Normalized "province||city" -> count
  cityTotals: Record<string, number>;
  // Normalized "province||city||barangay" -> count
  barangayCounts: Record<string, number>;
  // Region totals for selected cluster (used in tooltip line 2)
  regionTotals: Record<string, number>;
  // Normalized province name -> region display label
  provinceToRegion: Record<string, string>;
  globalMax: number;
  legendBins: HeatmapLegendBin[];
  // Province-specific legend bins keyed by normalized province name
  provinceLegendBinsByProvince: Record<string, HeatmapLegendBin[]>;
  selectedClusterDisplay: string;
};

export type AnomalyHeatmapData = {
  diseaseBaseColor: string;
  // Normalized province name -> region-projected anomaly count (for fill)
  provinceCounts: Record<string, number>;
  // Normalized province name -> actual anomaly count from province field (for tooltip)
  provinceDirectCounts: Record<string, number>;
  // Region name -> total anomalies in that region
  regionTotals: Record<string, number>;
  // Normalized province name -> region display label
  provinceToRegion: Record<string, string>;
  globalMax: number;
  legendBins: HeatmapLegendBin[];
  selectedDisease: string;
};
