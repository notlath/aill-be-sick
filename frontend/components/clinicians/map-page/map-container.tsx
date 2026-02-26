"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClusterStatistics,
  MapHeatmapData,
  PatientClusterData,
} from "@/types";
import { buildClusterRamp, getClusterBaseColor } from "@/utils/cluster-colors";
import { getMapDiseaseData } from "@/utils/map-data";
import { useEffect, useMemo, useState } from "react";
import provinces from "@/public/locations/provinces.json";
import regions from "@/public/locations/regions.json";
import PhilippinesMap from "./philippines-map";

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
  selectedTab: "disease" | "cluster" | "anomaly";
  clusters?: PatientClusterData;
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

  // Filter States
  const [disease, setDisease] = useState<string>("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
    if (selectedTab !== "cluster") return;

    let cancelled = false;

    async function fetchRecommendedK() {
      try {
        setLoadingRecommendation(true);
        const params = buildClusterQueryParams({ range: "2-25" });
        const res = await fetch(
          `${BACKEND_URL}/api/patient-clusters/silhouette?${params.toString()}`,
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
    setShowAllRegions(false);
    setShowAllCities(false);
  }, [selectedCluster, selectedTab]);

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
          `${BACKEND_URL}/api/patient-clusters?${params.toString()}`,
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

  useEffect(() => {
    if (selectedTab === "anomaly") {
      setDataLoading(false);
    }
  }, [selectedTab]);

  return (
    <div className="space-y-4">
      {/* Filters Overlay */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-base-200 p-4 rounded-lg relative z-50">
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
              <span className="text-xs text-base-content/70 whitespace-nowrap">
                {loadingRecommendation
                  ? "Calculating recommendation..."
                  : recommendedK
                    ? `Recommended: ${recommendedK}`
                    : "Recommended: 2-25"}
              </span>
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
                  <SelectValue placeholder="Select cluster" />
                </SelectTrigger>
                <SelectContent>
                  {clusterOptions.map((clusterId) => (
                    <SelectItem key={clusterId} value={clusterId}>
                      Cluster {clusterId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
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
          heatmapData={heatmapData}
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
    </div>
  );
}
