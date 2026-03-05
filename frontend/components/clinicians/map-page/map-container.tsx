"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { ClusterTimelineChart } from "@/components/clinicians/map-page/cluster-timeline-chart";
import { IllnessClusterTimelineChart } from "@/components/clinicians/map-page/illness-cluster-timeline-chart";
import { AnomalyTimelineChart } from "@/components/clinicians/map-page/anomaly-timeline-chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AnomalyHeatmapData,
  ClusterStatistics,
  IllnessClusterData, MapHeatmapData,
  OutbreakFullResult,
  PatientClusterData,
  SurveillanceAnomaly
} from "@/types";
import { buildClusterRamp, getClusterBaseColor } from "@/utils/cluster-colors";
import { getMapDiseaseData } from "@/utils/map-data";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import provinces from "@/public/locations/provinces.json";
import regions from "@/public/locations/regions.json";
import PhilippinesMap from "./philippines-map";

const PatientsModal = dynamic(
  () => import("./patients-modal"),
  { ssr: false }
);

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:10000";

const DASHBOARD_CLUSTER_VARIABLES = {
  age: "true",
  gender: "true",
  disease: "true",
  city: "true",
  region: "false",
} as const;

const buildClusterQueryParams = (extra: Record<string, string>) =>
  new URLSearchParams({
    ...extra,
    ...DASHBOARD_CLUSTER_VARIABLES,
  });

const DISEASES = [
  "Dengue",
  "Pneumonia",
  "Typhoid",
  "Diarrhea",
  "Measles",
  "Impetigo",
  "Influenza",
];

type MapContainerProps = {
  selectedTab: "disease" | "cluster" | "anomaly" | "illness-cluster";
  clusters?: PatientClusterData;
  illnessClusters?: IllnessClusterData;
  initialK?: number;
};

type RegionRecord = {
  psgc: string;
  name: string;
};

type ProvinceRecord = {
  psgc: string;
  name: string;
  regionPsgc: string;
  geoLevel: string;
};

const hasDominantDisease = (stat: ClusterStatistics): boolean => {
  if (!stat.disease_distribution) return false;

  const entries = Object.entries(stat.disease_distribution);
  if (entries.length <= 1) return true;

  const sorted = entries.sort((a, b) => b[1].count - a[1].count);
  const topDisease = sorted[0];
  const secondDisease = sorted[1];
  const percentageIncrease =
    (topDisease[1].count - secondDisease[1].count) / secondDisease[1].count;

  return percentageIncrease >= 0.4;
};

const getDashboardClusterOrder = (
  statistics: ClusterStatistics[],
): number[] => {
  return [...statistics]
    .sort((a, b) => {
      const aDominant = hasDominantDisease(a);
      const bDominant = hasDominantDisease(b);

      if (aDominant && !bDominant) return -1;
      if (!aDominant && bDominant) return 1;

      return b.count - a.count;
    })
    .map((stat) => stat.cluster_id);
};

const normalizeLoc = (value?: string | null): string => {
  if (!value) return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^region\s+/i, "")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s+region$/i, "")
    .replace(/^national capital region$/i, "ncr");
};

const regionRows = regions as RegionRecord[];
const provinceRows = provinces as ProvinceRecord[];
const regionNameByPsgc = new Map(
  regionRows.map((region) => [region.psgc, region.name]),
);

const regionPsgcByAlias = new Map<string, string>();
for (const region of regionRows) {
  const normalizedName = normalizeLoc(region.name);
  if (normalizedName) {
    regionPsgcByAlias.set(normalizedName, region.psgc);
  }

  const withoutParen = normalizeLoc(region.name.replace(/\s*\(.*?\)\s*/g, " "));
  if (withoutParen) {
    regionPsgcByAlias.set(withoutParen, region.psgc);
  }

  const parenMatch = region.name.match(/\(([^)]+)\)/g) ?? [];
  for (const match of parenMatch) {
    const alias = normalizeLoc(match.replace(/[()]/g, ""));
    if (alias) {
      regionPsgcByAlias.set(alias, region.psgc);
    }
  }
}

const regionPsgcSet = new Set(regionRows.map((region) => region.psgc));
const provinceNameToRegionPsgc = new Map<string, string>();
for (const province of provinceRows) {
  if (!regionPsgcSet.has(province.regionPsgc)) continue;
  provinceNameToRegionPsgc.set(province.name, province.regionPsgc);
}

const provinceNameByAlias = new Map<string, string>();
for (const province of provinceRows) {
  provinceNameByAlias.set(normalizeLoc(province.name), province.name);
}

export function MapContainer({
  selectedTab,
  clusters = undefined,
  illnessClusters = undefined,
  initialK = 4,
}: MapContainerProps) {
  const [clusterData, setClusterData] = useState<PatientClusterData | undefined>(
    clusters,
  );
  const [selectedCluster, setSelectedCluster] = useState<string>("1");
  const [k, setK] = useState(initialK);
  const [recommendedK, setRecommendedK] = useState<number | null>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [hasAutoAppliedRecommendation, setHasAutoAppliedRecommendation] =
    useState(false);
  const [clusterOptions, setClusterOptions] = useState<string[]>([]);
  const [clusterOrder, setClusterOrder] = useState<number[]>([]);
  const [showAllRegions, setShowAllRegions] = useState(false);
  const [showAllCities, setShowAllCities] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Illness Cluster States
  const [illnessClusterData, setIllnessClusterData] = useState<IllnessClusterData | undefined>(
    illnessClusters,
  );
  const [isPatientsModalOpen, setIsPatientsModalOpen] = useState(false);
  const [selectedIllnessCluster, setSelectedIllnessCluster] = useState<string>("1");
  const [illnessK, setIllnessK] = useState(initialK);
  const [illnessRecommendedK, setIllnessRecommendedK] = useState<number | null>(null);
  const [illnessLoadingRecommendation, setIllnessLoadingRecommendation] = useState(false);
  const [illnessHasAutoAppliedRecommendation, setIllnessHasAutoAppliedRecommendation] =
    useState(false);
  const [illnessClusterOptions, setIllnessClusterOptions] = useState<string[]>([]);
  const [illnessClusterOrder, setIllnessClusterOrder] = useState<number[]>([]);
  const [showAllIllnessRegions, setShowAllIllnessRegions] = useState(false);
  const [showAllIllnessCities, setShowAllIllnessCities] = useState(false);
  const [illnessSelectedVariables, setIllnessSelectedVariables] = useState({
    age: true,
    gender: true,
    barangay: false,
    city: true,
    province: false,
    region: false,
    time: false,
  });

  // Anomaly States
  const [anomalyDisease, setAnomalyDisease] = useState<string>(DISEASES[0]);
  const [anomalyData, setAnomalyData] = useState<SurveillanceAnomaly[]>([]);
  const [anomalyTotalAnalyzed, setAnomalyTotalAnalyzed] = useState(0);
  const [anomalyOutbreakAlert, setAnomalyOutbreakAlert] = useState(false);
  const [showAllAnomalyRegions, setShowAllAnomalyRegions] = useState(false);

  // Filter States
  const [disease, setDisease] = useState<string>("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleIllnessVariableChange = (variable: keyof typeof illnessSelectedVariables) => {
    const selectedCount =
      Object.values(illnessSelectedVariables).filter(Boolean).length;

    if (illnessSelectedVariables[variable] && selectedCount === 1) {
      return; // Don't allow unchecking the last variable
    }

    // Update variables - barangay, city, province, and region are mutually exclusive
    if (["barangay", "city", "province", "region"].includes(variable)) {
      setIllnessSelectedVariables((prev) => ({
        ...prev,
        barangay: variable === "barangay" ? !prev.barangay : false,
        city: variable === "city" ? !prev.city : false,
        province: variable === "province" ? !prev.province : false,
        region: variable === "region" ? !prev.region : false,
      }));
    } else {
      setIllnessSelectedVariables((prev) => ({
        ...prev,
        [variable]: !prev[variable],
      }));
    }
  };

  useEffect(() => {
    if (!clusters) return;
    const options = Array.from({ length: clusters.n_clusters }, (_, index) =>
      String(index + 1),
    );
    setClusterData(clusters);
    setClusterOptions(options);
    setClusterOrder(getDashboardClusterOrder(clusters.cluster_statistics));
    setSelectedCluster(options[0] ?? "1");
  }, [clusters]);

  useEffect(() => {
    if (!illnessClusters) return;
    const options = Array.from({ length: illnessClusters.n_clusters }, (_, index) =>
      String(index + 1),
    );
    setIllnessClusterData(illnessClusters);
    setIllnessClusterOptions(options);
    // Sort by count descending for illness clusters
    const illnessOrder = [...illnessClusters.cluster_statistics]
      .sort((a, b) => b.count - a.count)
      .map((stat) => stat.cluster_id);
    setIllnessClusterOrder(illnessOrder);
    setSelectedIllnessCluster(options[0] ?? "1");
  }, [illnessClusters]);

  useEffect(() => {
    if (selectedTab !== "cluster") return;

    let cancelled = false;

    async function fetchRecommendedK() {
      try {
        setLoadingRecommendation(true);
        const params = buildClusterQueryParams({ range: "2-25" });
        const res = await fetch(
          `${BACKEND_URL}/api/illness-clusters/silhouette?${params.toString()}`,
        );

        if (!res.ok) throw new Error("Failed to fetch silhouette analysis");

        const data = await res.json();
        const bestK =
          typeof data?.best?.k === "number" ? Number(data.best.k) : null;

        if (cancelled) return;

        if (bestK) {
          const clampedK = Math.min(25, Math.max(2, bestK));
          setRecommendedK(clampedK);
          if (!hasAutoAppliedRecommendation) {
            setK(clampedK);
            setHasAutoAppliedRecommendation(true);
          }
        }
      } catch (error) {
        console.error("Error fetching recommended k:", error);
      } finally {
        if (!cancelled) {
          setLoadingRecommendation(false);
        }
      }
    }

    fetchRecommendedK();

    return () => {
      cancelled = true;
    };
  }, [selectedTab, hasAutoAppliedRecommendation]);

  useEffect(() => {
    if (selectedTab !== "illness-cluster") return;

    let cancelled = false;

    async function fetchIllnessRecommendedK() {
      try {
        setIllnessLoadingRecommendation(true);
        const params = new URLSearchParams({
          range: "2-25",
          age: String(illnessSelectedVariables.age),
          gender: String(illnessSelectedVariables.gender),
          barangay: String(illnessSelectedVariables.barangay),
          city: String(illnessSelectedVariables.city),
          province: String(illnessSelectedVariables.province),
          region: String(illnessSelectedVariables.region),
          time: String(illnessSelectedVariables.time),
        });
        const res = await fetch(
          `${BACKEND_URL}/api/illness-clusters/silhouette?${params.toString()}`,
        );

        if (!res.ok) throw new Error("Failed to fetch illness silhouette analysis");

        const data = await res.json();
        const bestK =
          typeof data?.best?.k === "number" ? Number(data.best.k) : null;

        if (cancelled) return;

        if (bestK) {
          const clampedK = Math.min(25, Math.max(2, bestK));
          setIllnessRecommendedK(clampedK);
          if (!illnessHasAutoAppliedRecommendation) {
            setIllnessK(clampedK);
            setIllnessHasAutoAppliedRecommendation(true);
          }
        }
      } catch (error) {
        console.error("Error fetching illness recommended k:", error);
      } finally {
        if (!cancelled) {
          setIllnessLoadingRecommendation(false);
        }
      }
    }

    fetchIllnessRecommendedK();

    return () => {
      cancelled = true;
    };
  }, [selectedTab, illnessHasAutoAppliedRecommendation, illnessSelectedVariables]);

  useEffect(() => {
    setShowAllRegions(false);
    setShowAllCities(false);
  }, [selectedCluster, selectedTab]);

  useEffect(() => {
    setShowAllIllnessRegions(false);
    setShowAllIllnessCities(false);
  }, [selectedIllnessCluster, selectedTab]);

  const heatmapData = useMemo<MapHeatmapData | undefined>(() => {
    if (!clusterData || selectedTab !== "cluster") return undefined;

    const regionCountsByCluster = new Map<number, Map<string, number>>();

    for (const patient of clusterData.patients) {
      const clusterId = patient.cluster;
      const patientRegion = normalizeLoc(patient.region);
      if (!patientRegion) continue;

      const regionPsgc = regionPsgcByAlias.get(patientRegion);
      if (!regionPsgc) continue;

      const regionCounts = regionCountsByCluster.get(clusterId) ?? new Map();
      regionCounts.set(regionPsgc, (regionCounts.get(regionPsgc) || 0) + 1);
      regionCountsByCluster.set(clusterId, regionCounts);
    }

    const projectedProvinceCountsByCluster = new Map<number, Record<string, number>>();
    let globalMax = 0;

    for (let clusterId = 0; clusterId < clusterData.n_clusters; clusterId += 1) {
      const regionCounts = regionCountsByCluster.get(clusterId) ?? new Map();
      const projectedProvinceCounts: Record<string, number> = {};

      for (const [provinceName, regionPsgc] of provinceNameToRegionPsgc) {
        const count = regionCounts.get(regionPsgc) ?? 0;
        projectedProvinceCounts[provinceName] = count;
        if (count > globalMax) {
          globalMax = count;
        }
      }

      projectedProvinceCountsByCluster.set(clusterId, projectedProvinceCounts);
    }

    const selectedClusterIndex = Math.max(0, Number(selectedCluster) - 1);
    const selectedClusterId =
      clusterOrder[selectedClusterIndex] ?? selectedClusterIndex;
    const clusterBaseColor = getClusterBaseColor(selectedClusterIndex);

    const selectedRegionCountsByPsgc =
      regionCountsByCluster.get(selectedClusterId) ?? new Map<string, number>();

    const regionTotals: Record<string, number> = {};
    for (const [regionPsgc, count] of selectedRegionCountsByPsgc.entries()) {
      const regionName = regionNameByPsgc.get(regionPsgc);
      if (!regionName) continue;
      regionTotals[regionName] = count;
    }

    const provinceCounts: Record<string, number> = {};
    const provinceTotals: Record<string, number> = {};
    const cityTotals: Record<string, number> = {};
    const barangayCounts: Record<string, number> = {};
    for (const patient of clusterData.patients) {
      if (patient.cluster !== selectedClusterId) continue;
      const normalizedProvince = normalizeLoc(patient.province);
      if (!normalizedProvince) continue;
      const canonicalProvince =
        provinceNameByAlias.get(normalizedProvince) ?? patient.province?.trim();
      if (!canonicalProvince) continue;
      provinceCounts[canonicalProvince] = (provinceCounts[canonicalProvince] || 0) + 1;
      provinceTotals[canonicalProvince] = (provinceTotals[canonicalProvince] || 0) + 1;

      const normalizedCity = normalizeLoc(patient.city);
      if (!normalizedCity) continue;

      const provinceCityKey = `${normalizeLoc(canonicalProvince)}||${normalizedCity}`;
      cityTotals[provinceCityKey] = (cityTotals[provinceCityKey] || 0) + 1;

      const normalizedBarangay = normalizeLoc(patient.barangay);
      if (!normalizedBarangay) continue;

      const provinceCityBarangayKey = `${provinceCityKey}||${normalizedBarangay}`;
      barangayCounts[provinceCityBarangayKey] =
        (barangayCounts[provinceCityBarangayKey] || 0) + 1;
    }

    const provinceToRegion: Record<string, string> = {};
    for (const [provinceName, regionPsgc] of provinceNameToRegionPsgc.entries()) {
      const regionName = regionNameByPsgc.get(regionPsgc);
      if (!regionName) continue;
      provinceToRegion[normalizeLoc(provinceName)] = regionName;
    }

    const selectedProjectedProvinceCounts =
      projectedProvinceCountsByCluster.get(selectedClusterId) ?? {};

    const legendBins: MapHeatmapData["legendBins"] = [];
    const provinceLegendBinsByProvince: MapHeatmapData["provinceLegendBinsByProvince"] = {};
    if (globalMax > 0) {
      const colorRamp = buildClusterRamp(clusterBaseColor, 5);
      const bucketSize = Math.ceil(globalMax / colorRamp.length);
      for (let index = 0; index < colorRamp.length; index += 1) {
        const min = index * bucketSize + 1;
        const max = Math.min(globalMax, (index + 1) * bucketSize);
        if (min > max) continue;
        legendBins.push({
          min,
          max,
          color: colorRamp[index],
        });
      }

      const provinceBarangayMax = new Map<string, number>();
      for (const [key, count] of Object.entries(barangayCounts)) {
        const [normalizedProvinceName] = key.split("||");
        if (!normalizedProvinceName) continue;
        const currentMax = provinceBarangayMax.get(normalizedProvinceName) ?? 0;
        if (count > currentMax) {
          provinceBarangayMax.set(normalizedProvinceName, count);
        }
      }

      for (const [normalizedProvinceName, provinceMax] of provinceBarangayMax.entries()) {
        if (provinceMax <= 0) {
          provinceLegendBinsByProvince[normalizedProvinceName] = [];
          continue;
        }
        const provinceBucketSize = Math.ceil(provinceMax / colorRamp.length);
        const bins: MapHeatmapData["legendBins"] = [];
        for (let index = 0; index < colorRamp.length; index += 1) {
          const min = index * provinceBucketSize + 1;
          const max = Math.min(provinceMax, (index + 1) * provinceBucketSize);
          if (min > max) continue;
          bins.push({
            min,
            max,
            color: colorRamp[index],
          });
        }
        provinceLegendBinsByProvince[normalizedProvinceName] = bins;
      }
    }

    return {
      clusterBaseColor,
      provinceCounts,
      projectedProvinceCounts: selectedProjectedProvinceCounts,
      provinceTotals,
      cityTotals,
      barangayCounts,
      regionTotals,
      provinceToRegion,
      globalMax,
      legendBins,
      provinceLegendBinsByProvince,
      selectedClusterDisplay: selectedCluster,
    };
  }, [clusterData, selectedCluster, selectedTab, clusterOrder]);

  // ----- Illness Cluster Heatmap Data -----
  const illnessHeatmapData = useMemo<MapHeatmapData | undefined>(() => {
    if (!illnessClusterData || selectedTab !== "illness-cluster") return undefined;

    const regionCountsByCluster = new Map<number, Map<string, number>>();

    for (const illness of illnessClusterData.illnesses) {
      const clusterId = illness.cluster;
      const illnessRegion = normalizeLoc(illness.region);
      if (!illnessRegion) continue;

      const regionPsgc = regionPsgcByAlias.get(illnessRegion);
      if (!regionPsgc) continue;

      const regionCounts = regionCountsByCluster.get(clusterId) ?? new Map();
      regionCounts.set(regionPsgc, (regionCounts.get(regionPsgc) || 0) + 1);
      regionCountsByCluster.set(clusterId, regionCounts);
    }

    const projectedProvinceCountsByCluster = new Map<number, Record<string, number>>();
    let globalMax = 0;

    for (let clusterId = 0; clusterId < illnessClusterData.n_clusters; clusterId += 1) {
      const regionCounts = regionCountsByCluster.get(clusterId) ?? new Map();
      const projectedProvinceCounts: Record<string, number> = {};

      for (const [provinceName, regionPsgc] of provinceNameToRegionPsgc) {
        const count = regionCounts.get(regionPsgc) ?? 0;
        projectedProvinceCounts[provinceName] = count;
        if (count > globalMax) {
          globalMax = count;
        }
      }

      projectedProvinceCountsByCluster.set(clusterId, projectedProvinceCounts);
    }

    const selectedClusterIndex = Math.max(0, Number(selectedIllnessCluster) - 1);
    const selectedClusterId =
      illnessClusterOrder[selectedClusterIndex] ?? selectedClusterIndex;
    const clusterBaseColor = getClusterBaseColor(selectedClusterIndex);

    const selectedRegionCountsByPsgc =
      regionCountsByCluster.get(selectedClusterId) ?? new Map<string, number>();

    const regionTotals: Record<string, number> = {};
    for (const [regionPsgc, count] of selectedRegionCountsByPsgc.entries()) {
      const regionName = regionNameByPsgc.get(regionPsgc);
      if (!regionName) continue;
      regionTotals[regionName] = count;
    }

    const provinceCounts: Record<string, number> = {};
    const provinceTotals: Record<string, number> = {};
    const cityTotals: Record<string, number> = {};
    const barangayCounts: Record<string, number> = {};
    for (const illness of illnessClusterData.illnesses) {
      if (illness.cluster !== selectedClusterId) continue;
      const normalizedProvince = normalizeLoc(illness.province);
      if (!normalizedProvince) continue;
      const canonicalProvince =
        provinceNameByAlias.get(normalizedProvince) ?? illness.province?.trim();
      if (!canonicalProvince) continue;
      provinceCounts[canonicalProvince] = (provinceCounts[canonicalProvince] || 0) + 1;
      provinceTotals[canonicalProvince] = (provinceTotals[canonicalProvince] || 0) + 1;

      const normalizedCity = normalizeLoc(illness.city);
      if (!normalizedCity) continue;

      const provinceCityKey = `${normalizeLoc(canonicalProvince)}||${normalizedCity}`;
      cityTotals[provinceCityKey] = (cityTotals[provinceCityKey] || 0) + 1;

      const normalizedBarangay = normalizeLoc(illness.barangay);
      if (!normalizedBarangay) continue;

      const provinceCityBarangayKey = `${provinceCityKey}||${normalizedBarangay}`;
      barangayCounts[provinceCityBarangayKey] =
        (barangayCounts[provinceCityBarangayKey] || 0) + 1;
    }

    const provinceToRegion: Record<string, string> = {};
    for (const [provinceName, regionPsgc] of provinceNameToRegionPsgc.entries()) {
      const regionName = regionNameByPsgc.get(regionPsgc);
      if (!regionName) continue;
      provinceToRegion[normalizeLoc(provinceName)] = regionName;
    }

    const selectedProjectedProvinceCounts =
      projectedProvinceCountsByCluster.get(selectedClusterId) ?? {};

    const legendBins: MapHeatmapData["legendBins"] = [];
    const provinceLegendBinsByProvince: MapHeatmapData["provinceLegendBinsByProvince"] = {};
    if (globalMax > 0) {
      const colorRamp = buildClusterRamp(clusterBaseColor, 5);
      const bucketSize = Math.ceil(globalMax / colorRamp.length);
      for (let index = 0; index < colorRamp.length; index += 1) {
        const min = index * bucketSize + 1;
        const max = Math.min(globalMax, (index + 1) * bucketSize);
        if (min > max) continue;
        legendBins.push({
          min,
          max,
          color: colorRamp[index],
        });
      }

      const provinceBarangayMax = new Map<string, number>();
      for (const [key, count] of Object.entries(barangayCounts)) {
        const [normalizedProvinceName] = key.split("||");
        if (!normalizedProvinceName) continue;
        const currentMax = provinceBarangayMax.get(normalizedProvinceName) ?? 0;
        if (count > currentMax) {
          provinceBarangayMax.set(normalizedProvinceName, count);
        }
      }

      for (const [normalizedProvinceName, provinceMax] of provinceBarangayMax.entries()) {
        if (provinceMax <= 0) {
          provinceLegendBinsByProvince[normalizedProvinceName] = [];
          continue;
        }
        const provinceBucketSize = Math.ceil(provinceMax / colorRamp.length);
        const bins: MapHeatmapData["legendBins"] = [];
        for (let index = 0; index < colorRamp.length; index += 1) {
          const min = index * provinceBucketSize + 1;
          const max = Math.min(provinceMax, (index + 1) * provinceBucketSize);
          if (min > max) continue;
          bins.push({
            min,
            max,
            color: colorRamp[index],
          });
        }
        provinceLegendBinsByProvince[normalizedProvinceName] = bins;
      }
    }

    return {
      clusterBaseColor,
      provinceCounts,
      projectedProvinceCounts: selectedProjectedProvinceCounts,
      provinceTotals,
      cityTotals,
      barangayCounts,
      regionTotals,
      provinceToRegion,
      globalMax,
      legendBins,
      provinceLegendBinsByProvince,
      selectedClusterDisplay: selectedIllnessCluster,
    };
  }, [illnessClusterData, selectedIllnessCluster, selectedTab, illnessClusterOrder]);

  const selectedClusterSummary = useMemo(() => {
    if (!clusterData || selectedTab !== "cluster") return null;

    const selectedClusterIndex = Math.max(0, Number(selectedCluster) - 1);
    const selectedClusterId =
      clusterOrder[selectedClusterIndex] ?? selectedClusterIndex;
    const stat = clusterData.cluster_statistics.find(
      (item) => item.cluster_id === selectedClusterId,
    );

    if (!stat) return null;

    const totalGender =
      stat.gender_distribution.MALE +
      stat.gender_distribution.FEMALE +
      stat.gender_distribution.OTHER;
    const malePercent =
      totalGender > 0
        ? Math.round((stat.gender_distribution.MALE / totalGender) * 100)
        : 0;
    const femalePercent =
      totalGender > 0
        ? Math.round((stat.gender_distribution.FEMALE / totalGender) * 100)
        : 0;

    let diseaseLabel = "Mixed disease profile";
    if (stat.disease_distribution) {
      const entries = Object.entries(stat.disease_distribution).sort(
        (a, b) => b[1].count - a[1].count,
      );
      if (entries.length === 1) {
        diseaseLabel = `${entries[0][0]} (${entries[0][1].percent}%)`;
      } else if (entries.length > 1) {
        const [top, second] = entries;
        const gap = (top[1].count - second[1].count) / Math.max(1, second[1].count);
        if (gap >= 0.4) {
          diseaseLabel = `${top[0]} (${top[1].percent}%)`;
        }
      }
    }

    // --- Interpretation sentence (mirrors cluster-overview-cards logic) ---
    // Age descriptor
    let ageDescriptor = "patients";
    if (stat.avg_age >= 60) {
      ageDescriptor = "predominantly older adults";
    } else if (stat.avg_age >= 36) {
      ageDescriptor = "predominantly middle-aged adults";
    } else if (stat.avg_age >= 18) {
      ageDescriptor = "predominantly young adults";
    } else if (stat.avg_age >= 13) {
      ageDescriptor = "predominantly adolescents";
    } else {
      ageDescriptor = "predominantly children";
    }

    // Region / city location
    let regionLocation = "";
    let regionPrefix = "from";
    let hasMultipleCities = false;
    if (stat.top_cities && stat.top_cities.length >= 1) {
      regionLocation = stat.top_cities[0].city;
      regionPrefix = "from";
      hasMultipleCities = stat.top_cities.length > 1;
    } else if (stat.top_regions && stat.top_regions.length === 1) {
      regionLocation = stat.top_regions[0].region;
      regionPrefix = "from";
    } else if (stat.top_regions && stat.top_regions.length >= 2) {
      const topRegion = stat.top_regions[0];
      const secondRegion = stat.top_regions[1];
      const pctIncrease = (topRegion.count - secondRegion.count) / secondRegion.count;
      if (pctIncrease >= 0.4) {
        regionLocation = topRegion.region;
        regionPrefix = "mostly from";
      }
    }

    // Gender descriptor
    let genderDescriptor = "";
    let genderWord = "";
    if (malePercent >= 60) {
      genderDescriptor = "mostly";
      genderWord = "male";
    } else if (femalePercent >= 60) {
      genderDescriptor = "mostly";
      genderWord = "female";
    }

    // Dominant disease for interpretation
    let interpretationDisease: string | null = null;
    if (stat.disease_distribution) {
      const entries = Object.entries(stat.disease_distribution).sort(
        (a, b) => b[1].count - a[1].count,
      );
      if (entries.length === 1) {
        interpretationDisease = entries[0][0];
      } else if (entries.length > 1) {
        const [top, second] = entries;
        const gap = (top[1].count - second[1].count) / Math.max(1, second[1].count);
        if (gap >= 0.4) interpretationDisease = top[0];
      }
    }

    return {
      displayCluster: selectedCluster,
      clusterBaseColor: heatmapData?.clusterBaseColor ?? getClusterBaseColor(selectedClusterIndex),
      patientCount: stat.count,
      avgAge: stat.avg_age,
      minAge: stat.min_age,
      maxAge: stat.max_age,
      malePercent,
      femalePercent,
      diseaseLabel,
      allRegions: stat.top_regions,
      allCities: stat.top_cities,
      // Interpretation parts
      interpretation: {
        ageDescriptor,
        regionLocation,
        regionPrefix,
        genderDescriptor,
        genderWord,
        interpretationDisease,
        hasMultipleCities,
      },
    };
  }, [clusterData, selectedCluster, selectedTab, clusterOrder, heatmapData]);

  // Fetch all patient location data for map
  useEffect(() => {
    if (selectedTab !== "disease") return;

    async function fetchMapData() {
      setDataLoading(true);

      const params: any = {};
      if (disease !== "All") params.disease = disease;
      if (startDate) params.startDate = new Date(startDate);
      if (endDate) params.endDate = new Date(endDate);

      const result = await getMapDiseaseData(params);

      if (result.error) {
        console.error("Error fetching map data:", result.error);
      }
      setDataLoading(false);
    }

    fetchMapData();
  }, [selectedTab, disease, startDate, endDate]);

  // Fetch clusters when k changes
  useEffect(() => {
    if (selectedTab !== "cluster") return;

    async function fetchClusters() {
      try {
        setDataLoading(true);
        const params = buildClusterQueryParams({ n_clusters: String(k) });
        const res = await fetch(
          `${BACKEND_URL}/api/illness-clusters?${params.toString()}`,
        );

        if (!res.ok) throw new Error("Failed to fetch clusters");

        const data: PatientClusterData = await res.json();
        const nClusters = data.n_clusters || k;
        const newOptions = Array.from({ length: nClusters }, (_, i) =>
          String(i + 1),
        );

        setClusterData(data);
        setClusterOptions(newOptions);
        setClusterOrder(getDashboardClusterOrder(data.cluster_statistics));

        if (!newOptions.includes(selectedCluster)) {
          setSelectedCluster(newOptions[0] ?? "1");
        }
      } catch (err) {
        console.error("Error fetching clusters:", err);
      } finally {
        setDataLoading(false);
      }
    }

    fetchClusters();
  }, [k, selectedTab]);

  // Fetch illness clusters when k changes
  useEffect(() => {
    if (selectedTab !== "illness-cluster") return;

    async function fetchIllnessClusters() {
      try {
        setDataLoading(true);
        const params = new URLSearchParams({
          n_clusters: String(illnessK),
          age: String(illnessSelectedVariables.age),
          gender: String(illnessSelectedVariables.gender),
          barangay: String(illnessSelectedVariables.barangay),
          city: String(illnessSelectedVariables.city),
          province: String(illnessSelectedVariables.province),
          region: String(illnessSelectedVariables.region),
          time: String(illnessSelectedVariables.time),
        });
        const res = await fetch(
          `${BACKEND_URL}/api/illness-clusters?${params.toString()}`,
        );

        if (!res.ok) throw new Error("Failed to fetch illness clusters");

        const data: IllnessClusterData = await res.json();
        const nClusters = data.n_clusters || illnessK;
        const newOptions = Array.from({ length: nClusters }, (_, i) =>
          String(i + 1),
        );

        setIllnessClusterData(data);
        setIllnessClusterOptions(newOptions);
        const illnessOrder = [...data.cluster_statistics]
          .sort((a, b) => b.count - a.count)
          .map((stat) => stat.cluster_id);
        setIllnessClusterOrder(illnessOrder);

        if (!newOptions.includes(selectedIllnessCluster)) {
          setSelectedIllnessCluster(newOptions[0] ?? "1");
        }
      } catch (err) {
        console.error("Error fetching illness clusters:", err);
      } finally {
        setDataLoading(false);
      }
    }

    fetchIllnessClusters();
  }, [illnessK, selectedTab, illnessSelectedVariables]);

  useEffect(() => {
    if (selectedTab !== "anomaly") return;

    let cancelled = false;

    async function fetchAnomalyData() {
      try {
        setDataLoading(true);
        const res = await fetch(
          `${BACKEND_URL}/api/surveillance/outbreaks?contamination=0.05`,
        );
        if (!res.ok) throw new Error("Failed to fetch anomaly data");

        const data: OutbreakFullResult = await res.json();
        if (cancelled) return;
        setAnomalyData(data.anomalies);
        setAnomalyTotalAnalyzed(data.total_analyzed);
        setAnomalyOutbreakAlert(data.outbreak_alert);
      } catch (err) {
        console.error("Error fetching anomaly data:", err);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    fetchAnomalyData();

    return () => {
      cancelled = true;
    };
  }, [selectedTab]);

  // ----- Anomaly Heatmap Data -----
  const anomalyHeatmapData = useMemo<AnomalyHeatmapData | undefined>(() => {
    if (selectedTab !== "anomaly" || anomalyData.length === 0) return undefined;

    // Filter anomalies by selected disease
    const filtered = anomalyData.filter(
      (a) => a.disease === anomalyDisease,
    );

    // Aggregate anomaly counts by region
    const regionCounts = new Map<string, number>();
    // Also count per province directly
    const provinceDirectCounts: Record<string, number> = {};
    // Barangay, city, and province-level counts for drill-down
    const barangayCounts: Record<string, number> = {};
    const cityTotals: Record<string, number> = {};
    const provinceTotals: Record<string, number> = {};

    for (const anomaly of filtered) {
      const anomalyRegion = normalizeLoc(anomaly.region);
      if (anomalyRegion) {
        const regionPsgc = regionPsgcByAlias.get(anomalyRegion);
        if (regionPsgc) {
          regionCounts.set(regionPsgc, (regionCounts.get(regionPsgc) || 0) + 1);
        }
      }

      // Direct province counting
      if (anomaly.province) {
        const normalizedProvince = normalizeLoc(anomaly.province);
        const canonicalProvince = provinceNameByAlias.get(normalizedProvince);
        if (canonicalProvince) {
          const key = normalizeLoc(canonicalProvince);
          provinceDirectCounts[key] = (provinceDirectCounts[key] || 0) + 1;
          provinceTotals[key] = (provinceTotals[key] || 0) + 1;

          // City-level counting
          const normalizedCity = normalizeLoc(anomaly.city);
          if (normalizedCity) {
            const provinceCityKey = `${normalizeLoc(canonicalProvince)}||${normalizedCity}`;
            cityTotals[provinceCityKey] = (cityTotals[provinceCityKey] || 0) + 1;

            // Barangay-level counting
            const normalizedBarangay = normalizeLoc(anomaly.barangay);
            if (normalizedBarangay) {
              const provinceCityBarangayKey = `${provinceCityKey}||${normalizedBarangay}`;
              barangayCounts[provinceCityBarangayKey] =
                (barangayCounts[provinceCityBarangayKey] || 0) + 1;
            }
          }
        }
      }
    }

    // Project region counts to provinces (same pattern as clusters)
    const provinceCounts: Record<string, number> = {};
    const regionTotals: Record<string, number> = {};
    const provinceToRegion: Record<string, string> = {};
    let globalMax = 0;

    for (const [provinceName, regionPsgc] of provinceNameToRegionPsgc) {
      const count = regionCounts.get(regionPsgc) ?? 0;
      provinceCounts[normalizeLoc(provinceName)] = count;
      if (count > globalMax) globalMax = count;

      const regionName = regionNameByPsgc.get(regionPsgc);
      if (regionName) {
        provinceToRegion[normalizeLoc(provinceName)] = regionName;
        regionTotals[regionName] = (regionTotals[regionName] || 0);
      }
    }

    // Compute actual region totals from the region counts
    for (const [regionPsgc, count] of regionCounts.entries()) {
      const regionName = regionNameByPsgc.get(regionPsgc);
      if (regionName) {
        regionTotals[regionName] = count;
      }
    }

    // Pick color for this disease
    const diseaseIndex = DISEASES.indexOf(anomalyDisease);
    const diseaseBaseColor = getClusterBaseColor(
      diseaseIndex >= 0 ? diseaseIndex : 0,
    );

    // Build legend bins
    const legendBins: AnomalyHeatmapData["legendBins"] = [];
    const provinceLegendBinsByProvince: AnomalyHeatmapData["provinceLegendBinsByProvince"] = {};
    if (globalMax > 0) {
      const colorRamp = buildClusterRamp(diseaseBaseColor, 5);
      const bucketSize = Math.ceil(globalMax / colorRamp.length);
      for (let index = 0; index < colorRamp.length; index += 1) {
        const min = index * bucketSize + 1;
        const max = Math.min(globalMax, (index + 1) * bucketSize);
        if (min > max) continue;
        legendBins.push({ min, max, color: colorRamp[index] });
      }

      // Build province-specific legend bins from barangay counts
      const provinceBarangayMax = new Map<string, number>();
      for (const [key, count] of Object.entries(barangayCounts)) {
        const [normalizedProvinceName] = key.split("||");
        if (!normalizedProvinceName) continue;
        const currentMax = provinceBarangayMax.get(normalizedProvinceName) ?? 0;
        if (count > currentMax) {
          provinceBarangayMax.set(normalizedProvinceName, count);
        }
      }

      for (const [normalizedProvinceName, provinceMax] of provinceBarangayMax.entries()) {
        if (provinceMax <= 0) {
          provinceLegendBinsByProvince[normalizedProvinceName] = [];
          continue;
        }
        const provinceBucketSize = Math.ceil(provinceMax / colorRamp.length);
        const bins: AnomalyHeatmapData["legendBins"] = [];
        for (let index = 0; index < colorRamp.length; index += 1) {
          const min = index * provinceBucketSize + 1;
          const max = Math.min(provinceMax, (index + 1) * provinceBucketSize);
          if (min > max) continue;
          bins.push({ min, max, color: colorRamp[index] });
        }
        provinceLegendBinsByProvince[normalizedProvinceName] = bins;
      }
    }

    return {
      diseaseBaseColor,
      provinceCounts,
      provinceDirectCounts,
      barangayCounts,
      cityTotals,
      provinceTotals,
      regionTotals,
      provinceToRegion,
      globalMax,
      legendBins,
      provinceLegendBinsByProvince,
      selectedDisease: anomalyDisease,
    };
  }, [anomalyData, anomalyDisease, selectedTab]);

  // ----- Anomaly Summary -----
  const CONTAMINATION = 0.05; // matches the contamination param sent to the backend
  const anomalySummary = useMemo(() => {
    if (selectedTab !== "anomaly" || anomalyData.length === 0 || !anomalyHeatmapData)
      return null;

    const filtered = anomalyData.filter((a) => a.disease === anomalyDisease);

    // Top regions sorted by count
    const topRegions = Object.entries(anomalyHeatmapData.regionTotals)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    // Top 5 most anomalous cases (lowest anomaly_score = most anomalous)
    const topCases = [...filtered]
      .sort((a, b) => a.anomaly_score - b.anomaly_score)
      .slice(0, 5);

    const anomalyRateNum =
      anomalyTotalAnalyzed > 0
        ? (filtered.length / anomalyTotalAnalyzed) * 100
        : 0;
    const anomalyRate = anomalyRateNum.toFixed(1);

    // --- Interpretation signals ---

    // 1. Severity — derived from contamination (0.05 = model's alarm ceiling)
    //    > 2× contamination (10%) = high; 1×–2× (5–10%) = moderate; < 1× = low
    let severityLabel: string;
    if (anomalyRateNum > CONTAMINATION * 100 * 2) {
      severityLabel = "high anomaly burden";
    } else if (anomalyRateNum >= CONTAMINATION * 100) {
      severityLabel = "moderate anomaly signal";
    } else {
      severityLabel = "low anomaly level";
    }

    // 2. Geographic focus — 40% dominance rule (same as cluster interpretation)
    let geoFocus: string;
    if (topRegions.length === 0) {
      geoFocus = "no regional data available";
    } else if (topRegions.length === 1) {
      geoFocus = `concentrated in ${topRegions[0][0]}`;
    } else {
      const [top, second] = topRegions;
      const dominance = (top[1] - second[1]) / Math.max(1, second[1]);
      geoFocus =
        dominance >= 0.4
          ? `concentrated in ${top[0]}`
          : "spread across multiple regions";
    }

    // 3. Recency — anchored to the WHO 21-day outbreak investigation window
    //    ≤7 days = acute; 8–21 days = recent (within WHO window); >21 = none recent
    let recencyStatement: string;
    if (filtered.length > 0) {
      const nowMs = Date.now();
      const mostRecentMs = Math.max(
        ...filtered.map((a) => new Date(a.created_at).getTime()),
      );
      const daysSince = (nowMs - mostRecentMs) / (1000 * 60 * 60 * 24);
      const mostRecentDate = new Date(mostRecentMs).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      if (daysSince <= 7) {
        recencyStatement = `active — latest case ${mostRecentDate}`;
      } else if (daysSince <= 21) {
        recencyStatement = `recent — latest case ${mostRecentDate} (within WHO 21-day window)`;
      } else {
        recencyStatement = `no recent cases — latest was ${mostRecentDate}`;
      }
    } else {
      recencyStatement = "no cases detected";
    }

    // 4. Deviation — based on Isolation Forest scoring function midpoint
    //    Score 0 = classification boundary; −0.15 = half of typical decision threshold range
    //    ≤ −0.15 = deeply anomalous path lengths; > −0.15 = borderline
    let deviationStatement: string;
    if (filtered.length > 0) {
      const meanScore =
        filtered.reduce((sum, a) => sum + a.anomaly_score, 0) / filtered.length;
      deviationStatement =
        meanScore <= -0.15
          ? "strong statistical deviation from expected patterns"
          : "mild statistical deviation (borderline cases)";
    } else {
      deviationStatement = "insufficient data for deviation analysis";
    }

    return {
      diseaseCount: filtered.length,
      totalAnalyzed: anomalyTotalAnalyzed,
      outbreakAlert: anomalyOutbreakAlert,
      anomalyRate,
      topRegions,
      topCases,
      diseaseBaseColor: anomalyHeatmapData.diseaseBaseColor,
      // Interpretation
      interpretation: {
        severityLabel,
        geoFocus,
        recencyStatement,
        deviationStatement,
      },
    };
  }, [anomalyData, anomalyDisease, selectedTab, anomalyHeatmapData, anomalyTotalAnalyzed, anomalyOutbreakAlert]);

  // ----- Illness Cluster Summary -----
  const selectedIllnessClusterSummary = useMemo(() => {
    if (!illnessClusterData || selectedTab !== "illness-cluster") return null;

    const selectedClusterIndex = Math.max(0, Number(selectedIllnessCluster) - 1);
    const selectedClusterId =
      illnessClusterOrder[selectedClusterIndex] ?? selectedClusterIndex;
    const stat = illnessClusterData.cluster_statistics.find(
      (item) => item.cluster_id === selectedClusterId,
    );

    if (!stat) return null;

    const totalGender =
      stat.gender_distribution.MALE +
      stat.gender_distribution.FEMALE +
      stat.gender_distribution.OTHER;
    const malePercent =
      totalGender > 0
        ? Math.round((stat.gender_distribution.MALE / totalGender) * 100)
        : 0;
    const femalePercent =
      totalGender > 0
        ? Math.round((stat.gender_distribution.FEMALE / totalGender) * 100)
        : 0;

    let diseaseLabel = "Mixed disease profile";
    if (stat.disease_distribution) {
      const entries = Object.entries(stat.disease_distribution).sort(
        (a, b) => b[1].count - a[1].count,
      );
      if (entries.length === 1) {
        diseaseLabel = `${entries[0][0]} (${entries[0][1].percent}%)`;
      } else if (entries.length > 1) {
        const [top, second] = entries;
        const gap = (top[1].count - second[1].count) / Math.max(1, second[1].count);
        if (gap >= 0.4) {
          diseaseLabel = `${top[0]} (${top[1].percent}%)`;
        }
      }
    }

    // --- Interpretation sentence ---
    let ageDescriptor = "patients";
    if (stat.avg_patient_age >= 60) {
      ageDescriptor = "predominantly older adults";
    } else if (stat.avg_patient_age >= 36) {
      ageDescriptor = "predominantly middle-aged adults";
    } else if (stat.avg_patient_age >= 18) {
      ageDescriptor = "predominantly young adults";
    } else if (stat.avg_patient_age >= 13) {
      ageDescriptor = "predominantly adolescents";
    } else {
      ageDescriptor = "predominantly children";
    }

    // Region, Province, City, or Barangay - respect selected variables
    let regionLocation = "";
    let regionPrefix = "from";
    let hasMultipleCities = false;

    // Determine which geographic variable to show based on selection
    const showBarangay = illnessSelectedVariables.barangay;
    const showCity = illnessSelectedVariables.city;
    const showProvince = illnessSelectedVariables.province;
    const showRegion = illnessSelectedVariables.region;

    // Priority: Barangay > City > Province > Region
    if (showBarangay && stat.top_barangays && stat.top_barangays.length >= 1) {
      regionLocation = stat.top_barangays[0].barangay;
      regionPrefix = "from";
      hasMultipleCities = stat.top_barangays.length > 1;
    } else if (showCity && stat.top_cities && stat.top_cities.length >= 1) {
      // Show top city even if there are multiple
      regionLocation = stat.top_cities[0].city;
      regionPrefix = "from";
      hasMultipleCities = stat.top_cities.length > 1;
    } else if (showProvince && stat.top_provinces && stat.top_provinces.length === 1) {
      regionLocation = stat.top_provinces[0].province;
      regionPrefix = "from";
    } else if (showProvince && stat.top_provinces && stat.top_provinces.length >= 2) {
      const topProvince = stat.top_provinces[0];
      const secondProvince = stat.top_provinces[1];
      const percentageIncrease =
        (topProvince.count - secondProvince.count) /
        secondProvince.count;

      if (percentageIncrease >= 0.4) {
        regionLocation = topProvince.province;
        regionPrefix = "mostly from";
      }
    } else if (showRegion && stat.top_regions && stat.top_regions.length === 1) {
      // Only one region, display "from {region}"
      regionLocation = stat.top_regions[0].region;
      regionPrefix = "from";
    } else if (showRegion && stat.top_regions && stat.top_regions.length >= 2) {
      // Two or more regions - check if top region is dominant
      const topRegion = stat.top_regions[0];
      const secondRegion = stat.top_regions[1];
      const percentageIncrease =
        (topRegion.count - secondRegion.count) /
        secondRegion.count;

      if (percentageIncrease >= 0.4) {
        // Top region is 40% higher, display "mostly from {region}"
        regionLocation = topRegion.region;
        regionPrefix = "mostly from";
      }
      // Otherwise, don't mention region at all
    }

    let genderDescriptor = "";
    let genderWord = "";
    if (malePercent >= 60) {
      genderDescriptor = "mostly";
      genderWord = "male";
    } else if (femalePercent >= 60) {
      genderDescriptor = "mostly";
      genderWord = "female";
    }

    let interpretationDisease: string | null = null;
    if (stat.disease_distribution) {
      const entries = Object.entries(stat.disease_distribution).sort(
        (a, b) => b[1].count - a[1].count,
      );
      if (entries.length === 1) {
        interpretationDisease = entries[0][0];
      } else if (entries.length > 1) {
        const [top, second] = entries;
        const gap = (top[1].count - second[1].count) / Math.max(1, second[1].count);
        if (gap >= 0.4) interpretationDisease = top[0];
      }
    }

    return {
      displayCluster: selectedIllnessCluster,
      clusterBaseColor: illnessHeatmapData?.clusterBaseColor ?? getClusterBaseColor(selectedClusterIndex),
      diagnosisCount: stat.count,
      avgAge: stat.avg_patient_age,
      minAge: stat.min_patient_age,
      maxAge: stat.max_patient_age,
      malePercent,
      femalePercent,
      diseaseLabel,
      allRegions: stat.top_regions,
      allCities: stat.top_cities,
      interpretation: {
        ageDescriptor,
        regionLocation,
        regionPrefix,
        genderDescriptor,
        genderWord,
        interpretationDisease,
        hasMultipleCities,
      },
    };
  }, [illnessClusterData, selectedIllnessCluster, selectedTab, illnessClusterOrder, illnessHeatmapData]);

  useEffect(() => {
    setShowAllAnomalyRegions(false);
  }, [anomalyDisease, selectedTab]);

  const selectedIllnessClusterPatients = useMemo(() => {
    if (!illnessClusterData || selectedTab !== "illness-cluster") return [];
    const selectedClusterIndex = Math.max(0, Number(selectedIllnessCluster) - 1);
    const selectedClusterId =
      illnessClusterOrder[selectedClusterIndex] ?? selectedClusterIndex;
    return illnessClusterData.illnesses.filter(
      (illness) => illness.cluster === selectedClusterId
    );
  }, [illnessClusterData, selectedIllnessCluster, illnessClusterOrder, selectedTab]);

  return (
    <div className="space-y-4">
      {/* Filters Overlay */}
      <div className="flex flex-col sm:flex-row items-start gap-4 bg-base-200 p-4 rounded-lg relative z-50">
        {selectedTab === "disease" && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap">
              Disease:
            </label>
            <Select value={disease} onValueChange={setDisease}>
              <SelectTrigger className="w-40 bg-white shadow-sm">
                <SelectValue placeholder="Select disease" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Diseases</SelectItem>
                {DISEASES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedTab === "cluster" && (
          <>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium whitespace-nowrap">
                  Groups:
                </label>
                <Input
                  type="number"
                  min={2}
                  max={25}
                  value={k}
                  onChange={(e) => {
                    const nextK = Number(e.target.value);
                    if (Number.isNaN(nextK)) return;
                    setK(Math.min(25, Math.max(2, nextK)));
                  }}
                  className="w-24"
                />
              </div>
              <p className="text-xs text-base-content/70 whitespace-nowrap">
                {loadingRecommendation
                  ? "Calculating recommendation..."
                  : recommendedK
                    ? `Recommended: ${recommendedK}`
                    : "Recommended: 2-25"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">
                Cluster:
              </label>
              <Select
                value={selectedCluster}
                onValueChange={setSelectedCluster}
              >
                <SelectTrigger className="w-40 bg-white shadow-sm">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {clusterOptions.map((clusterId) => (
                    <SelectItem key={clusterId} value={clusterId}>
                      Group {clusterId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {selectedTab === "illness-cluster" && (
          <div className="space-y-2">
            {/* Variable Selection */}
            <div className="flex flex-wrap gap-2 items-center">
              <label
                className={`btn btn-xs border border-primary/10 cursor-pointer font-normal ${illnessSelectedVariables.age ? "btn-primary btn-soft" : "btn-outline border border-border"}`}
                title="Include patient age in clustering"
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={illnessSelectedVariables.age}
                  onChange={() => handleIllnessVariableChange("age")}
                />
                <span>Age</span>
              </label>
              <label
                className={`btn btn-xs border border-primary/10 cursor-pointer font-normal ${illnessSelectedVariables.gender ? "btn-primary btn-soft" : "btn-outline border border-border"}`}
                title="Include patient gender in clustering"
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={illnessSelectedVariables.gender}
                  onChange={() => handleIllnessVariableChange("gender")}
                />
                <span>Gender</span>
              </label>
              <label
                className={`btn btn-xs border border-primary/10 cursor-pointer font-normal ${illnessSelectedVariables.barangay ? "btn-primary btn-soft" : "btn-outline border border-border"}`}
                title="Include barangay in clustering (mutually exclusive with Region, Province, City)"
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={illnessSelectedVariables.barangay}
                  onChange={() => handleIllnessVariableChange("barangay")}
                />
                <span>Barangay</span>
              </label>
              <label
                className={`btn btn-xs border border-primary/10 cursor-pointer font-normal ${illnessSelectedVariables.city ? "btn-primary btn-soft" : "btn-outline border border-border"}`}
                title="Include city in clustering (mutually exclusive with Region, Province, Barangay)"
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={illnessSelectedVariables.city}
                  onChange={() => handleIllnessVariableChange("city")}
                />
                <span>City</span>
              </label>
              <label
                className={`btn btn-xs border border-primary/10 cursor-pointer font-normal ${illnessSelectedVariables.province ? "btn-primary btn-soft" : "btn-outline border border-border"}`}
                title="Include province in clustering (mutually exclusive with Region, City, Barangay)"
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={illnessSelectedVariables.province}
                  onChange={() => handleIllnessVariableChange("province")}
                />
                <span>Province</span>
              </label>
              <label
                className={`btn btn-xs border border-primary/10 cursor-pointer font-normal ${illnessSelectedVariables.region ? "btn-primary btn-soft" : "btn-outline border border-border"}`}
                title="Include region in clustering (mutually exclusive with Province, City, Barangay)"
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={illnessSelectedVariables.region}
                  onChange={() => handleIllnessVariableChange("region")}
                />
                <span>Region</span>
              </label>
            </div>
            <div className="flex items-start gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium whitespace-nowrap">
                    Groups:
                  </label>
                  <Input
                    type="number"
                    min={2}
                    max={25}
                    value={illnessK}
                    onChange={(e) => {
                      const nextK = Number(e.target.value);
                      if (Number.isNaN(nextK)) return;
                      setIllnessK(Math.min(25, Math.max(2, nextK)));
                    }}
                    className="w-24"
                  />
                </div>
                <p className="text-xs text-base-content/70 whitespace-nowrap">
                  {illnessLoadingRecommendation
                    ? "Calculating recommendation..."
                    : illnessRecommendedK
                      ? `Recommended: ${illnessRecommendedK}`
                      : "Recommended: 2-25"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium whitespace-nowrap">
                  Cluster:
                </label>
                <Select
                  value={selectedIllnessCluster}
                  onValueChange={setSelectedIllnessCluster}
                >
                  <SelectTrigger className="w-40 bg-white shadow-sm">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {illnessClusterOptions.map((clusterId) => (
                      <SelectItem key={clusterId} value={clusterId}>
                        Group {clusterId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {selectedTab === "anomaly" && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap">
              Disease:
            </label>
            <Select value={anomalyDisease} onValueChange={setAnomalyDisease}>
              <SelectTrigger className="w-40 bg-white shadow-sm">
                <SelectValue placeholder="Select disease" />
              </SelectTrigger>
              <SelectContent>
                {DISEASES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedTab === "disease" && (
          <div className="flex items-center gap-4 border-l border-base-300 pl-4 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">From:</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">To:</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <PhilippinesMap
          selectedTab={selectedTab}
          selectedCluster={selectedCluster}
          selectedIllnessCluster={selectedIllnessCluster}
          heatmapData={heatmapData}
          illnessHeatmapData={illnessHeatmapData}
          anomalyHeatmapData={anomalyHeatmapData}
        />
        {dataLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-base-200 rounded-lg z-10">
            <div className="flex flex-col items-center gap-4">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-sm text-base-content/60">
                Loading map data...
              </p>
            </div>
          </div>
        )}
      </div>

      {selectedTab === "cluster" && selectedClusterSummary && (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-4">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: selectedClusterSummary.clusterBaseColor }}
              />
              <h3 className="card-title text-base">
                Cluster {selectedClusterSummary.displayCluster} Quick Profile
              </h3>
            </div>

            {/* Natural language interpretation */}
            <div className="rounded-lg bg-base-200 px-4 py-3 text-sm text-base-content/80 leading-relaxed">
              {(() => {
                const { ageDescriptor, regionLocation, regionPrefix, genderDescriptor, genderWord, interpretationDisease, hasMultipleCities } = selectedClusterSummary.interpretation;
                return (
                  <>
                    <strong>{selectedClusterSummary.patientCount}</strong> patients
                    {regionLocation && (
                      <>
                        {" "}
                        {hasMultipleCities ? "primarily" : regionPrefix}{" "}
                        <strong>{regionLocation}</strong>
                      </>
                    )}
                    , {ageDescriptor}
                    {genderWord && (
                      <>, {genderDescriptor} <strong>{genderWord}</strong></>
                    )}
                    {interpretationDisease && (
                      <>, primarily <strong>{interpretationDisease}</strong></>
                    )}
                    .
                  </>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
              <div className="bg-base-200 rounded-box p-3">
                <p className="text-base-content/70">Patients</p>
                <p className="text-xl font-semibold">
                  {selectedClusterSummary.patientCount}
                </p>
              </div>

              <div className="bg-base-200 rounded-box p-3">
                <p className="text-base-content/70">Age profile</p>
                <p className="font-semibold">
                  {selectedClusterSummary.avgAge} yrs avg
                </p>
                <p className="text-base-content/80 text-xs">
                  Range: {selectedClusterSummary.minAge}-{selectedClusterSummary.maxAge}
                </p>
              </div>

              <div className="bg-base-200 rounded-box p-3">
                <p className="text-base-content/70">Gender split</p>
                <p className="font-semibold">
                  {selectedClusterSummary.malePercent}% male
                </p>
                <p className="text-base-content/80 text-xs">
                  {selectedClusterSummary.femalePercent}% female
                </p>
              </div>

              <div className="bg-base-200 rounded-box p-3">
                <p className="text-base-content/70">Dominant disease signal</p>
                <p className="font-semibold">{selectedClusterSummary.diseaseLabel}</p>
              </div>
            </div>


            {clusterData && selectedClusterSummary && (
              <ClusterTimelineChart
                patients={clusterData.patients}
                nClusters={clusterData.n_clusters}
                selectedCluster={
                  clusterOrder[Math.max(0, Number(selectedCluster) - 1)] ??
                  Math.max(0, Number(selectedCluster) - 1)
                }
                clusterColorIndex={Math.max(0, Number(selectedCluster) - 1)}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-base-200 rounded-box p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">Top Regions</p>
                  {selectedClusterSummary.allRegions.length > 2 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setShowAllRegions((prev) => !prev)}
                    >
                      {showAllRegions ? "Show less" : "View all"}
                    </button>
                  )}
                </div>
                {selectedClusterSummary.allRegions.length > 0 ? (
                  <div className="space-y-1">
                    {(showAllRegions
                      ? selectedClusterSummary.allRegions
                      : selectedClusterSummary.allRegions.slice(0, 2)
                    ).map((region) => (
                      <p key={region.region}>
                        {region.region} ({region.count})
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-base-content/70">No region data</p>
                )}
              </div>

              <div className="bg-base-200 rounded-box p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">Top Cities</p>
                  {selectedClusterSummary.allCities.length > 2 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setShowAllCities((prev) => !prev)}
                    >
                      {showAllCities ? "Show less" : "View all"}
                    </button>
                  )}
                </div>
                {selectedClusterSummary.allCities.length > 0 ? (
                  <div className="space-y-1">
                    {(showAllCities
                      ? selectedClusterSummary.allCities
                      : selectedClusterSummary.allCities.slice(0, 2)
                    ).map((city) => (
                      <p key={city.city}>
                        {city.city} ({city.count})
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-base-content/70">No city data</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === "illness-cluster" && selectedIllnessClusterSummary && (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: selectedIllnessClusterSummary.clusterBaseColor }}
                />
                <h3 className="card-title text-base">
                  Cluster {selectedIllnessClusterSummary.displayCluster} Quick Profile
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline border-border"
                onClick={() => setIsPatientsModalOpen(true)}
              >
                View patients
              </button>
            </div>

            {/* Natural language interpretation */}
            <div className="rounded-lg bg-base-200 px-4 py-3 text-sm text-base-content/80 leading-relaxed">
              {(() => {
                const { ageDescriptor, regionLocation, regionPrefix, genderDescriptor, genderWord, interpretationDisease, hasMultipleCities } = selectedIllnessClusterSummary.interpretation;
                return (
                  <>
                    <strong>{selectedIllnessClusterSummary.diagnosisCount}</strong> diagnoses
                    {regionLocation && (
                      <>
                        {" "}
                        {hasMultipleCities ? "primarily" : regionPrefix}{" "}
                        <strong>{regionLocation}</strong>
                      </>
                    )}
                    , {ageDescriptor}
                    {genderWord && (
                      <>, {genderDescriptor} <strong>{genderWord}</strong></>
                    )}
                    {interpretationDisease && (
                      <>, primarily <strong>{interpretationDisease}</strong></>
                    )}
                    .
                  </>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
              <div className="bg-base-200 rounded-box p-3">
                <p className="text-base-content/70">Diagnoses</p>
                <p className="text-xl font-semibold">
                  {selectedIllnessClusterSummary.diagnosisCount}
                </p>
              </div>

              <div className="bg-base-200 rounded-box p-3">
                <p className="text-base-content/70">Age profile</p>
                <p className="font-semibold">
                  {selectedIllnessClusterSummary.avgAge} yrs avg
                </p>
                <p className="text-base-content/80 text-xs">
                  Range: {selectedIllnessClusterSummary.minAge}-{selectedIllnessClusterSummary.maxAge}
                </p>
              </div>

              <div className="bg-base-200 rounded-box p-3">
                <p className="text-base-content/70">Gender split</p>
                <p className="font-semibold">
                  {selectedIllnessClusterSummary.malePercent}% male
                </p>
                <p className="text-base-content/80 text-xs">
                  {selectedIllnessClusterSummary.femalePercent}% female
                </p>
              </div>

              <div className="bg-base-200 rounded-box p-3">
                <p className="text-base-content/70">Dominant disease signal</p>
                <p className="font-semibold">{selectedIllnessClusterSummary.diseaseLabel}</p>
              </div>
            </div>

            {illnessClusterData && selectedIllnessClusterSummary && (
              <IllnessClusterTimelineChart
                illnesses={illnessClusterData.illnesses}
                nClusters={illnessClusterData.n_clusters}
                selectedCluster={
                  illnessClusterOrder[Math.max(0, Number(selectedIllnessCluster) - 1)] ??
                  Math.max(0, Number(selectedIllnessCluster) - 1)
                }
                clusterColorIndex={Math.max(0, Number(selectedIllnessCluster) - 1)}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-base-200 rounded-box p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">Top Regions</p>
                  {selectedIllnessClusterSummary.allRegions.length > 2 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setShowAllIllnessRegions((prev) => !prev)}
                    >
                      {showAllIllnessRegions ? "Show less" : "View all"}
                    </button>
                  )}
                </div>
                {selectedIllnessClusterSummary.allRegions.length > 0 ? (
                  <div className="space-y-1">
                    {(showAllIllnessRegions
                      ? selectedIllnessClusterSummary.allRegions
                      : selectedIllnessClusterSummary.allRegions.slice(0, 2)
                    ).map((region) => (
                      <p key={region.region}>
                        {region.region} ({region.count})
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-base-content/70">No region data</p>
                )}
              </div>

              <div className="bg-base-200 rounded-box p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">Top Cities</p>
                  {selectedIllnessClusterSummary.allCities.length > 2 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setShowAllIllnessCities((prev) => !prev)}
                    >
                      {showAllIllnessCities ? "Show less" : "View all"}
                    </button>
                  )}
                </div>
                {selectedIllnessClusterSummary.allCities.length > 0 ? (
                  <div className="space-y-1">
                    {(showAllIllnessCities
                      ? selectedIllnessClusterSummary.allCities
                      : selectedIllnessClusterSummary.allCities.slice(0, 2)
                    ).map((city) => (
                      <p key={city.city}>
                        {city.city} ({city.count})
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-base-content/70">No city data</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === "anomaly" && anomalySummary && (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-4">
            {anomalySummary.outbreakAlert && (
              <div className="alert alert-warning text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span>Outbreak alert: anomaly count exceeds expected threshold across all diseases</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: anomalySummary.diseaseBaseColor }}
                />
                <h3 className="card-title text-base">
                  {anomalyDisease} Anomaly Overview
                </h3>
              </div>
              <Link
                href="/alerts"
                className="btn btn-ghost btn-xs text-primary"
              >
                View full analysis →
              </Link>
            </div>

            {/* Natural language interpretation */}
            <div className="rounded-lg bg-base-200 px-4 py-3 text-sm text-base-content/80 leading-relaxed space-y-1">
              <p>
                {anomalySummary.outbreakAlert && (
                  <><strong>⚠️ Outbreak threshold exceeded.</strong>{" "}</>
                )}
                <strong>{anomalySummary.diseaseCount} anomalies</strong> detected for{" "}
                <strong>{anomalyDisease}</strong>{" "}
                ({anomalySummary.anomalyRate}% of {anomalySummary.totalAnalyzed} records),{" "}
                {anomalySummary.interpretation.severityLabel},{" "}
                {anomalySummary.interpretation.geoFocus}.
              </p>
              <p className="text-base-content/60 text-xs">
                {anomalySummary.interpretation.deviationStatement.charAt(0).toUpperCase()}
                {anomalySummary.interpretation.deviationStatement.slice(1)}.
                {" "}Pattern {anomalySummary.interpretation.recencyStatement}.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
              <div className="bg-base-200 rounded-box p-3">
                <p className="text-base-content/70">Anomalies detected</p>
                <p className="text-xl font-semibold">
                  {anomalySummary.diseaseCount}
                </p>
                <p className="text-base-content/80 text-xs">
                  for {anomalyDisease}
                </p>
              </div>

              <div className="bg-base-200 rounded-box p-3">
                <p className="text-base-content/70">Total analyzed</p>
                <p className="text-xl font-semibold">
                  {anomalySummary.totalAnalyzed}
                </p>
                <p className="text-base-content/80 text-xs">
                  diagnosis records
                </p>
              </div>

              <div className="bg-base-200 rounded-box p-3">
                <p className="text-base-content/70">Anomaly rate</p>
                <p className="text-xl font-semibold">
                  {anomalySummary.anomalyRate}%
                </p>
                <p className="text-base-content/80 text-xs">
                  of total for this disease
                </p>
              </div>

              <div className="bg-base-200 rounded-box p-3">
                <p className="text-base-content/70">Alert status</p>
                <p className="font-semibold">
                  {anomalySummary.outbreakAlert ? (
                    <span className="text-warning">⚠️ Outbreak alert</span>
                  ) : (
                    <span className="text-success">✅ Normal</span>
                  )}
                </p>
              </div>
            </div>
            {anomalySummary && (
              <AnomalyTimelineChart
                anomalies={anomalyData.filter((a) => a.disease === anomalyDisease)}
                disease={anomalyDisease}
                diseaseColor={anomalySummary.diseaseBaseColor}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-base-200 rounded-box p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">Top Affected Regions</p>
                  {anomalySummary.topRegions.length > 3 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setShowAllAnomalyRegions((prev) => !prev)}
                    >
                      {showAllAnomalyRegions ? "Show less" : "View all"}
                    </button>
                  )}
                </div>
                {anomalySummary.topRegions.length > 0 ? (
                  <div className="space-y-1">
                    {(showAllAnomalyRegions
                      ? anomalySummary.topRegions
                      : anomalySummary.topRegions.slice(0, 3)
                    ).map(([region, count]) => (
                      <p key={region}>
                        {region} ({count})
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-base-content/70">No anomalies for this disease</p>
                )}
              </div>

              <div className="bg-base-200 rounded-box p-3">
                <p className="font-semibold mb-2">Most Anomalous Cases</p>
                {anomalySummary.topCases.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table table-xs">
                      <thead>
                        <tr>
                          <th>Location</th>
                          <th>Date</th>
                          <th>Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anomalySummary.topCases.map((c) => (
                          <tr key={c.id}>
                            <td>{c.city || c.province || c.region || "—"}</td>
                            <td>{new Date(c.created_at).toLocaleDateString()}</td>
                            <td className="font-mono">{c.anomaly_score.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-base-content/70">No anomalies for this disease</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === "illness-cluster" && (
        <PatientsModal
          isOpen={isPatientsModalOpen}
          onClose={() => setIsPatientsModalOpen(false)}
          patients={selectedIllnessClusterPatients}
          clusterDisplay={selectedIllnessClusterSummary?.displayCluster || selectedIllnessCluster}
        />
      )}
    </div>
  );
}
