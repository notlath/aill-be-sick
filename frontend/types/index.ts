
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
  diagnosed_at?: string | null;
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

export interface ProvinceCount {
  province: string;
  count: number;
}

export interface BarangayCount {
  barangay: string;
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

export interface SurveillanceUser {
  id: number;
  name: string | null;
  email: string | null;
  role: string;
  city: string | null;
  region: string | null;
  province: string | null;
  barangay: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  age: number | null;
  gender: string | null;
}

export interface SurveillanceAnomaly {
  id: number;
  disease: string;
  createdAt: string;
  latitude: number;
  longitude: number;
  city: string | null;
  province: string | null;
  barangay: string | null;
  region: string | null;
  district: string | null;
  confidence: number;
  uncertainty: number;
  userId: number;
  user: SurveillanceUser;
  is_anomaly: boolean;
  anomaly_score: number;
  /** Pipe-separated reason codes, e.g. "GEOGRAPHIC:RARE|COMBINED:MULTI". Null for normal records. */
  reason: string | null;
}

export interface OutbreakSummaryStats {
  total_records: number;
  anomaly_count: number;
  normal_count: number;
  contamination_used: number;
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
  normal_diagnoses: SurveillanceAnomaly[];
  summary: OutbreakSummaryStats;
  // Legacy top-level aliases (still present in backend response for backwards compat)
  total_analyzed: number;
  anomaly_count: number;
  normal_count: number;
  outbreak_alert: boolean;
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
  // Normalized "province||city||barangay" -> count
  barangayCounts: Record<string, number>;
  // Normalized "province||city" -> count
  cityTotals: Record<string, number>;
  // Normalized province name -> count (for tooltip at province level)
  provinceTotals: Record<string, number>;
  // Region name -> total anomalies in that region
  regionTotals: Record<string, number>;
  // Normalized province name -> region display label
  provinceToRegion: Record<string, string>;
  globalMax: number;
  legendBins: HeatmapLegendBin[];
  // Province-specific legend bins keyed by normalized province name
  provinceLegendBinsByProvince: Record<string, HeatmapLegendBin[]>;
  selectedDisease: string;
};

// Types for illness clustering data
export interface IllnessRecord {
  id: number;
  disease: string;
  confidence: number;
  uncertainty: number;
  city: string | null;
  province: string | null;
  barangay: string | null;
  region: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  diagnosed_at: string | null;
  patient_id: number;
  patient_name: string | null;
  patient_email: string | null;
  patient_age: number;
  patient_gender: "MALE" | "FEMALE" | "OTHER";
  cluster: number;
}

export interface IllnessClusterStatistics {
  cluster_id: number;
  count: number;
  disease_distribution: Record<string, { count: number; percent: number }>;
  top_diseases: { disease: string; count: number }[];
  avg_patient_age: number;
  min_patient_age: number;
  max_patient_age: number;
  gender_distribution: GenderDistribution;
  top_regions: RegionCount[];
  top_provinces?: ProvinceCount[];
  top_cities: CityCount[];
  top_barangays?: BarangayCount[];
  top_districts?: { district: string; count: number }[];
  temporal_distribution?: Record<string, number>;
}

export interface IllnessClusterData {
  n_clusters: number;
  total_illnesses: number;
  cluster_statistics: IllnessClusterStatistics[];
  illnesses: IllnessRecord[];
  centers: number[][];
}

export type SearchParams = Record<string, string | string[] | undefined>;
