export type ClusterVariableKey =
  | "age"
  | "gender"
  | "district"
  | "time"
  | "riskLevel"
  | "symptomSeverity"
  | "comorbiditiesCount";

export type ClusterVariableSelection = Record<ClusterVariableKey, boolean>;

export const DEFAULT_CLUSTER_VARIABLES: ClusterVariableSelection = {
  age: true,
  gender: true,
  district: true,
  time: false,
  riskLevel: false,
  symptomSeverity: false,
  comorbiditiesCount: false,
};

export const MIN_CLUSTER_COUNT = 2;
export const MAX_CLUSTER_COUNT = 25;
export const DEFAULT_CLUSTER_COUNT = 4;

export const clampClusterCount = (
  value: number,
  fallback = DEFAULT_CLUSTER_COUNT,
): number => {
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return fallback;
  }

  const roundedValue = Math.round(value);

  if (roundedValue < MIN_CLUSTER_COUNT) {
    return MIN_CLUSTER_COUNT;
  }

  if (roundedValue > MAX_CLUSTER_COUNT) {
    return MAX_CLUSTER_COUNT;
  }

  return roundedValue;
};

export const normalizeClusterVariables = (
  input?: Partial<ClusterVariableSelection>,
  fallback: ClusterVariableSelection = DEFAULT_CLUSTER_VARIABLES,
): ClusterVariableSelection => {
  const normalized: ClusterVariableSelection = {
    age: input?.age ?? fallback.age,
    gender: input?.gender ?? fallback.gender,
    district: input?.district ?? fallback.district,
    time: input?.time ?? fallback.time,
    riskLevel: input?.riskLevel ?? fallback.riskLevel,
    symptomSeverity: input?.symptomSeverity ?? fallback.symptomSeverity,
    comorbiditiesCount:
      input?.comorbiditiesCount ?? fallback.comorbiditiesCount,
  };

  if (!Object.values(normalized).some(Boolean)) {
    return { ...fallback };
  }

  return normalized;
};
