"use client";

import { useEffect, useMemo, useRef, useState, memo } from "react";
import * as d3 from "d3";
import { useGeoData, ViewState, ViewLevel, MapFeature } from "@/hooks/use-geo-data";
import { ChevronLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AnomalyHeatmapData, MapHeatmapData } from "@/types";
import provinces from "@/public/locations/provinces.json";


// Helper to determine next level in the flow
const getNextLevel = (current: ViewLevel): ViewLevel | null => {
  // Country (Provinces) -> Province (Barangays)
  if (current === "country") return "province";
  // Province (Barangays) -> End of line
  return null;
};

type SearchItem = {
  l: string; // Label
  i: number; // ID
  t: 'province' | 'city' | 'barangay';
  p: number; // Parent ID (Province ID)
  c?: number; // City ID (if barangay)
  lbl?: string; // Display Label
};

type PhilippinesMapProps = {
  selectedTab?: "disease" | "cluster" | "anomaly";
  selectedDisease?: string;
  selectedCluster?: string;
  heatmapData?: MapHeatmapData;
  anomalyHeatmapData?: AnomalyHeatmapData;
}

type ProvinceRecord = {
  psgc: string;
  name: string;
};

const ZERO_CLUSTER_COLOR = "#d1d5db";
const COUNTRY_MIN_ZOOM = 0.35;
const ZOOM_STEP_MULTIPLIER = 0.45;

const provinceRows = provinces as ProvinceRecord[];
const provinceNameByPsgc = new Map(
  provinceRows.map((province) => [province.psgc, province.name]),
);

const normalizeLoc = (value?: string | null): string => {
  if (!value) return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/^province of\s+/i, "")
    .replace(/\s+province$/i, "");
};

const PhilippinesMap = memo(({ selectedTab, heatmapData, anomalyHeatmapData }: PhilippinesMapProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewState, setViewState] = useState<ViewState>({
    level: "country",
    id: null,
    name: "Philippines (Provinces)",
  });

  const [history, setHistory] = useState<ViewState[]>([]);

  // --- Search State ---
  const [searchIndex, setSearchIndex] = useState<SearchItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [searchLoading, setSearchLoading] = useState(true);

  // Use Custom Hook for Data Fetching
  const { geoData, loading, error } = useGeoData(viewState);

  const projectedProvinceCounts = useMemo(() => {
    if (!heatmapData) return new Map<string, number>();
    const mapped = new Map<string, number>();
    for (const [provinceName, count] of Object.entries(heatmapData.projectedProvinceCounts)) {
      mapped.set(normalizeLoc(provinceName), count);
    }
    return mapped;
  }, [heatmapData]);

  const provinceClusterCounts = useMemo(() => {
    if (!heatmapData) return new Map<string, number>();
    const mapped = new Map<string, number>();
    for (const [provinceName, count] of Object.entries(heatmapData.provinceCounts)) {
      mapped.set(normalizeLoc(provinceName), count);
    }
    return mapped;
  }, [heatmapData]);

  const provinceTotals = useMemo(() => {
    if (!heatmapData) return new Map<string, number>();
    const mapped = new Map<string, number>();
    for (const [provinceName, count] of Object.entries(heatmapData.provinceTotals)) {
      mapped.set(normalizeLoc(provinceName), count);
    }
    return mapped;
  }, [heatmapData]);

  const cityTotals = useMemo(() => {
    if (!heatmapData) return new Map<string, number>();
    return new Map<string, number>(Object.entries(heatmapData.cityTotals));
  }, [heatmapData]);

  const barangayClusterCounts = useMemo(() => {
    if (!heatmapData) return new Map<string, number>();
    return new Map<string, number>(Object.entries(heatmapData.barangayCounts));
  }, [heatmapData]);

  const cityNameByPsgc = useMemo(() => {
    const mapped = new Map<number, string>();
    if (!geoData?.boundaries) return mapped;
    for (const boundary of geoData.boundaries) {
      const cityPsgc = boundary.properties.adm3_psgc;
      const cityName = boundary.properties.adm3_en;
      if (!cityPsgc || !cityName) continue;
      mapped.set(cityPsgc, cityName);
    }
    return mapped;
  }, [geoData?.boundaries]);

  const currentProvinceName = useMemo(() => {
    if (viewState.level !== "province") return null;
    if (viewState.id) {
      const fromPsgc = provinceNameByPsgc.get(viewState.id);
      if (fromPsgc) return fromPsgc;
    }
    const fromFeature = geoData?.features?.[0]?.properties?.adm2_en;
    if (fromFeature) return fromFeature;
    return null;
  }, [geoData?.features, viewState.id, viewState.level]);

  const currentProvinceNormalized = useMemo(
    () => normalizeLoc(currentProvinceName),
    [currentProvinceName],
  );

  const activeProvinceLegendBins = useMemo(() => {
    if (!heatmapData || !currentProvinceNormalized) return [];
    return heatmapData.provinceLegendBinsByProvince[currentProvinceNormalized] ?? [];
  }, [heatmapData, currentProvinceNormalized]);

  // --- Load Search Index ---
  useEffect(() => {
    fetch('/search-index.json')
      .then(res => res.json())
      .then(data => {
        setSearchIndex(data);
        setSearchLoading(false);
      })
      .catch(err => {
        console.error("Failed to load search index", err);
        setSearchLoading(false);
      });
  }, []);

  // --- Search Logic ---
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    // Filter logic: limit to 20 results for performance
    const results = searchIndex.filter(item =>
      (item.lbl || item.l).toLowerCase().includes(lowerQuery)
    ).slice(0, 20);

    setSearchResults(results);
  }, [searchQuery, searchIndex]);

  // --- Dynamic Title Update ---
  useEffect(() => {
    if (!geoData || loading || !geoData.features.length) return;

    // Default: try to get the Province Name from the first feature
    // In 'province' view, features are Barangays having adm2_en as Province Name
    const firstFeature = geoData.features[0];
    let provinceName = firstFeature.properties.adm2_en || "Province"; // Fallback

    // Handle Country View
    if (viewState.level === 'country') {
      provinceName = "Philippines (Provinces)";
    }

    let newName = provinceName;

    // If highlighting, user wants context (City, etc.)
    if (highlightId && viewState.level === 'province') {
      // Try to find the highlighted item in features or boundaries

      let foundName = null;
      let cityName = null;

      // Check Boundaries (Cities)
      const boundary = geoData.boundaries?.find(b => {
        const bid = b.properties.adm3_psgc || (b as any).id;
        return bid === highlightId;
      });

      if (boundary) {
        foundName = boundary.properties.adm3_en; // Marikina City
        // If found, title: "Marikina City, Province Name"
      } else {
        // Check Features (Barangays)
        const feature = geoData.features.find(f => {
          const fid = f.properties.adm4_psgc || (f as any).id;
          return fid === highlightId;
        });

        if (feature) {
          // Found a Barangay
          // Check if it has City info? adm3_en
          cityName = feature.properties.adm3_en;
          const bgyName = feature.properties.adm4_en;
          if (bgyName) foundName = bgyName;
        }
      }

      if (foundName) {
        if (cityName) {
          // Brgy, City, Prov
          newName = `${foundName}, ${cityName}, ${provinceName}`;
        } else {
          // City, Prov
          newName = `${foundName}, ${provinceName}`;
        }
      }
    }

    // Only update if needed to avoid infinite loop
    // And only if we are currently showing "Loading..." or just generic province name but have better info now
    if (viewState.name === "Loading..." || (highlightId && viewState.name !== newName)) {
      setViewState(prev => ({ ...prev, name: newName }));
    } else if (viewState.name !== newName && !highlightId && viewState.level === 'province') {
      // Also update if we just loaded the province and name is generic/outdated
      setViewState(prev => ({ ...prev, name: newName }));
    }

  }, [geoData, loading, highlightId, viewState.level, viewState.name]);


  const handleSearchSelect = (item: SearchItem) => {
    setSearchQuery(""); // Clear input ? Or keep it? Let's clear to show map.
    setIsSearching(false);

    // 1. Set Highlight
    setHighlightId(item.i);

    // 2. Drill Down Logic

    if (item.t === 'province') {
      if (viewState.id !== item.i.toString()) {
        setHistory(prev => [...prev, viewState]);
        setViewState({
          level: 'province',
          id: item.i.toString(),
          name: item.l // Set Name initially from search index
        });
      }
    } else if (item.t === 'city' || item.t === 'barangay') {
      const provinceId = item.p;

      if (viewState.id !== provinceId.toString()) {
        setHistory(prev => [...prev, viewState]);
        setViewState({
          level: 'province',
          id: provinceId.toString(),
          name: "Loading..." // Will be updated by useEffect
        });
      }
    }
  };

  // Persistent Ctrl+Scroll Prevention Listener
  useEffect(() => {
    const preventBrowserZoom = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };

    const svgNode = svgRef.current;
    if (svgNode) {
      svgNode.addEventListener("wheel", preventBrowserZoom, { passive: false });
    }

    return () => {
      if (svgNode) {
        svgNode.removeEventListener("wheel", preventBrowserZoom);
      }
    };
  }, []);

  // Render Map Effect
  useEffect(() => {
    if (!geoData || !containerRef.current || !svgRef.current) return;

    const render = (shouldResetZoom = false) => {
      const container = containerRef.current;
      const svg = d3.select(svgRef.current);

      if (!container || !svg) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      svg.attr("width", width).attr("height", height);

      // --- D3 Setup ---
      // Clear previous render
      svg.selectAll("g").remove();

      // Determine Projection
      let projection: d3.GeoProjection;
      if (viewState.level === "country") {
        projection = d3.geoMercator()
          .center([122, 12])
          .translate([width / 2, height / 2])
          .scale(height * 6.5);
      } else {
        projection = d3.geoMercator();
        if (geoData.features.length > 0) {
          // Fit to features
          projection.fitExtent([[20, 20], [width - 20, height - 20]], {
            type: "FeatureCollection",
            features: geoData.features
          } as any);
        } else {
          projection.center([122, 12]).scale(1000).translate([width / 2, height / 2]);
        }
      }

      const pathGenerator = d3.geoPath().projection(projection);

      // Color Scale
      const colorScale = d3.scaleOrdinal(d3.schemeBlues[9]);

      const getClusterCountForFeature = (feature: MapFeature): number => {
        if (selectedTab !== "cluster" || !heatmapData) return 0;

        if (viewState.level === "province") {
          if (!currentProvinceNormalized) return 0;
          const cityName =
            feature.properties.adm3_en ||
            cityNameByPsgc.get(feature.properties.adm3_psgc || 0) ||
            "";
          const barangayName = feature.properties.adm4_en || "";
          if (!cityName || !barangayName) return 0;
          const barangayKey = `${currentProvinceNormalized}||${normalizeLoc(cityName)}||${normalizeLoc(barangayName)}`;
          return barangayClusterCounts.get(barangayKey) ?? 0;
        }

        const provinceName = feature.properties.adm2_en || feature.properties.adm3_en;
        if (!provinceName) return 0;
        return projectedProvinceCounts.get(normalizeLoc(provinceName)) ?? 0;
      };

      const getFeatureFillColor = (feature: MapFeature): string => {
        if (selectedTab === "cluster" && heatmapData) {
          const count = getClusterCountForFeature(feature);
          const activeLegendBins =
            viewState.level === "province"
              ? activeProvinceLegendBins
              : heatmapData.legendBins;
          if (count <= 0 || activeLegendBins.length === 0) return ZERO_CLUSTER_COLOR;

          const matchedBin = activeLegendBins.find(
            (bin) => count >= bin.min && count <= bin.max,
          );

          return matchedBin?.color ?? activeLegendBins[activeLegendBins.length - 1]?.color ?? ZERO_CLUSTER_COLOR;
        }

        const name =
          feature.properties.adm4_en ||
          feature.properties.adm3_en ||
          feature.properties.adm2_en ||
          feature.properties.adm1_en ||
          "unknown";
        return colorScale(name);
      };

      const getAnomalyCountForFeature = (feature: MapFeature): number => {
        if (selectedTab !== "anomaly" || !anomalyHeatmapData) return 0;
        // Anomaly heatmap only at country level (province shapes)
        const provinceName = feature.properties.adm2_en || feature.properties.adm3_en;
        if (!provinceName) return 0;
        return anomalyHeatmapData.provinceCounts[normalizeLoc(provinceName)] ?? 0;
      };

      const getAnomalyFillColor = (feature: MapFeature): string => {
        if (!anomalyHeatmapData) return ZERO_CLUSTER_COLOR;
        const count = getAnomalyCountForFeature(feature);
        if (count <= 0 || anomalyHeatmapData.legendBins.length === 0) return ZERO_CLUSTER_COLOR;
        const matchedBin = anomalyHeatmapData.legendBins.find(
          (bin) => count >= bin.min && count <= bin.max,
        );
        return matchedBin?.color ?? anomalyHeatmapData.legendBins[anomalyHeatmapData.legendBins.length - 1]?.color ?? ZERO_CLUSTER_COLOR;
      };

      // Create Group Hierarchy
      const g = svg.append("g");

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent(viewState.level === "country" ? [COUNTRY_MIN_ZOOM, 20] : [1, 20])
        .filter((event) => {
          if (event.type === "wheel" && !event.ctrlKey) return false;
          return true;
        })
        .on("zoom", (event) => {
          g.attr("transform", event.transform);

          // Semantic Zoom: Scale stroke width
          const k = event.transform.k;
          const baseFeatureStroke = viewState.level === "province" ? 0.05 : 0.2;
          const baseBoundaryStroke = 0.5;
          const highlightStroke = 2.5; // Increased from 1.0 to 2.5

          g.select(".layer-features").selectAll("path").attr("stroke-width", baseFeatureStroke / k);
          g.select(".layer-boundaries").selectAll("path").attr("stroke-width", baseBoundaryStroke / k);
          // Keep highlight stroke consistent but thicker
          g.selectAll(".highlighted").attr("stroke-width", highlightStroke / k);
        });

      svg.call(zoom as any);

      // --- Render Features Layer ---
      const features = geoData.features;
      const boundaries = geoData.boundaries || [];

      const featureLayer = g.append("g").attr("class", "layer-features");

      // Tooltip
      const tooltip = d3.select("body").selectAll(".map-tooltip").data([0]).join("div")
        .attr("class", "map-tooltip absolute z-50 hidden p-2 text-xs text-white bg-black/80 rounded pointer-events-none")
        .style("top", "0")
        .style("left", "0");

      featureLayer.selectAll("path")
        .data(features)
        .join("path")
        .attr("d", pathGenerator as any)
        .attr("fill", (d) => {
          if (selectedTab === "anomaly" && anomalyHeatmapData) {
            return getAnomalyFillColor(d);
          }
          return getFeatureFillColor(d);
        })
        .attr("stroke", (d) => {
          // Check highlight for Feature Layer (Barangays usually)
          if (highlightId) {
            const id = d.properties.adm4_psgc || d.properties.adm3_psgc || d.properties.adm2_psgc;
            if (id === highlightId) return "#f59e0b"; // Amber-500
          }
          return "#fff";
        })
        .attr("stroke-width", (d) => {
          if (highlightId) {
            const id = d.properties.adm4_psgc || d.properties.adm3_psgc || d.properties.adm2_psgc;
            if (id === highlightId) return 0.05 * 10; // 10x thicker (was 5x)
          }
          return viewState.level === "province" ? 0.05 : 0.2
        })
        .attr("class", (d) => {
          let cls = "hover:opacity-80 transition-opacity cursor-pointer";
          if (highlightId) {
            const id = d.properties.adm4_psgc || d.properties.adm3_psgc || d.properties.adm2_psgc;
            if (id === highlightId) cls += " highlighted z-10"; // z-10 doesn't work in SVG, order matters
          }
          return cls;
        })
        // Raise highlighted element to top
        .filter((d) => {
          const id = d.properties.adm4_psgc || d.properties.adm3_psgc || d.properties.adm2_psgc;
          return id === highlightId;
        })
        .raise() // Bring to front
        .each(function () {
          // Re-select to apply click/hover handlers to all, not just filtered
        });

      // Simple Click/Hover handlers for ALL features
      featureLayer.selectAll("path")
        .on("click", (event, d: any) => {
          event.stopPropagation();
          handleFeatureClick(d);
        })
        .on("mousemove", (event, d: any) => {
          const name = d.properties.adm4_en || d.properties.adm3_en || d.properties.adm2_en || d.properties.adm1_en || "Feature";
          if (selectedTab === "anomaly" && anomalyHeatmapData) {
            const provinceName =
              d.properties.adm2_en || d.properties.adm3_en || name;
            const normalizedProvince = normalizeLoc(provinceName);
            const provinceCount =
              anomalyHeatmapData.provinceDirectCounts[normalizedProvince] ?? 0;
            const regionName =
              anomalyHeatmapData.provinceToRegion[normalizedProvince] ?? "Region";
            const regionTotal =
              anomalyHeatmapData.regionTotals[regionName] ?? 0;

            tooltip
              .style("display", "block")
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 10) + "px")
              .html(
                `<strong>${name}</strong>: ${provinceCount} ${anomalyHeatmapData.selectedDisease} anomalies<br/>${regionName} total: ${regionTotal}`,
              );
            return;
          }

          if (selectedTab === "cluster" && heatmapData) {
            if (viewState.level === "province") {
              const provinceName = currentProvinceName || "Province";
              const normalizedProvince = normalizeLoc(provinceName);
              const cityName =
                d.properties.adm3_en ||
                cityNameByPsgc.get(d.properties.adm3_psgc) ||
                "Unknown city";
              const barangayName = d.properties.adm4_en || name;
              const barangayKey = `${normalizedProvince}||${normalizeLoc(cityName)}||${normalizeLoc(barangayName)}`;
              const cityKey = `${normalizedProvince}||${normalizeLoc(cityName)}`;
              const barangayCount = barangayClusterCounts.get(barangayKey) ?? 0;
              const cityTotal = cityTotals.get(cityKey) ?? 0;
              const provinceTotal = provinceTotals.get(normalizedProvince) ?? 0;

              tooltip
                .style("display", "block")
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px")
                .html(
                  `${barangayName}: ${barangayCount}<br/>${cityName} total: ${cityTotal}<br/>${provinceName} total: ${provinceTotal}`,
                );
              return;
            }

            const normalizedProvince = normalizeLoc(
              d.properties.adm2_en || d.properties.adm3_en || name,
            );
            const provinceCount = provinceClusterCounts.get(normalizedProvince) ?? 0;
            const regionName =
              heatmapData.provinceToRegion[normalizedProvince] ?? "Region";
            const regionTotal = heatmapData.regionTotals[regionName] ?? 0;

            tooltip
              .style("display", "block")
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 10) + "px")
              .html(`${name}: ${provinceCount}<br/>${regionName} total: ${regionTotal}`);
            return;
          }

          tooltip
            .style("display", "block")
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px")
            .text(name);
        })
        .on("mouseleave", () => {
          tooltip.style("display", "none");
        });

      // --- Render Boundaries Layer (Overlay - Cities) ---
      const boundaryLayer = g.append("g").attr("class", "layer-boundaries").style("pointer-events", "none");

      if (boundaries) {
        boundaryLayer.selectAll("path")
          .data(boundaries)
          .join("path")
          .attr("d", pathGenerator as any)
          .attr("fill", "none")
          .attr("stroke", (d) => {
            if (highlightId) {
              const id = d.properties.adm3_psgc || d.properties.id; // Boundary usually city ID
              if (id === highlightId) return "#f59e0b";
            }
            return "#444";
          })
          .attr("stroke-width", (d) => {
            if (highlightId) {
              const id = d.properties.adm3_psgc || d.properties.id;
              if (id === highlightId) return 0.5 * 6; // 6x thicker (was 3x)
            }
            return 0.5;
          })
          .attr("stroke-opacity", (d) => {
            if (highlightId) {
              const id = d.properties.adm3_psgc || d.properties.id;
              if (id === highlightId) return 1;
            }
            return 0.8;
          })
          .attr("stroke-linejoin", "round")
          .filter((d) => {
            const id = d.properties.adm3_psgc || d.properties.id;
            return id === highlightId;
          })
          .raise();
      }

      if (shouldResetZoom) {
        svg.call(zoom.transform as any, d3.zoomIdentity);
      }

      return () => { // specific cleanup if needed
        // tooltip handled by d3 selection
      };
    };

    const cleanup = render(true); // Initial render

    const resizeObserver = new ResizeObserver(() => {
      render(false);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      d3.selectAll(".map-tooltip").remove(); // Global cleanup of tooltips
    };
  }, [
    geoData,
    viewState,
    containerRef,
    highlightId,
    selectedTab,
    heatmapData,
    anomalyHeatmapData,
    projectedProvinceCounts,
    provinceClusterCounts,
    provinceTotals,
    cityTotals,
    barangayClusterCounts,
    cityNameByPsgc,
    currentProvinceName,
    currentProvinceNormalized,
    activeProvinceLegendBins,
  ]); // Depend on highlightId

  // Handle Drill-down
  const handleFeatureClick = (feature: MapFeature) => {
    const props = feature.properties;
    const nextLevel = getNextLevel(viewState.level);

    // Clear highlight on manual click (optional, but good UX)
    setHighlightId(null);

    if (viewState.level === "country" && nextLevel === "province") {
      let nextId: string | null = null;
      let nextName = "Unknown";

      nextId = props.adm2_psgc ? props.adm2_psgc.toString() : null;
      nextName = props.adm2_en || "Province";

      if (!nextId && props.id) nextId = props.id.toString();

      if (nextId) {
        setHistory((prev) => [...prev, viewState]);
        setViewState({
          level: nextLevel,
          id: nextId,
          name: nextName
        });
      }
    }
  };

  const handleBack = () => {
    setHighlightId(null);
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setViewState(previousState);
  };

  return (
    <section className="space-y-4">
      <div className="relative z-30">
        <Search className="absolute z-10 top-1/2 -translate-y-1/2 left-4 text-muted size-3.5" />
        <Input
          placeholder={searchLoading ? "Loading search data..." : "Search locations (e.g. Marikina, Quezon City)"}
          className="pl-10"
          disabled={searchLoading}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsSearching(true);
            if (e.target.value === "") {
              setHighlightId(null);
            }
          }}
          onFocus={() => setIsSearching(true)}
        />

        {/* Search Results Dropdown */}
        {isSearching && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
            {searchResults.map((item) => {
              return (
                <button
                  key={`${item.t}-${item.i}`}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex flex-col gap-0.5"
                  onClick={() => handleSearchSelect(item)}
                >
                  <span className="font-medium">{item.lbl || item.l}</span>
                  <span className="text-xs text-muted capitalize">{item.t}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <Card className="group hover:border-primary/30">

        {/* Map Container */}
        <div ref={containerRef} className="w-full h-[800px] overflow-hidden relative">
          {/* Navigation / Header */}
          <div className="absolute top-4 left-4 flex items-center justify-between pointer-events-none z-20">
            <div className="flex items-center gap-2 text-sm pointer-events-auto">
              {history.length > 0 && (
                <button
                  onClick={handleBack}
                  className="btn btn-sm btn-soft bg-white/80 backdrop-blur-sm"
                >
                  <ChevronLeft className="size-3.5" /> Back
                </button>
              )}
              <span className="font-semibold text-lg bg-white/80 backdrop-blur-sm px-2 py-1 rounded">
                {viewState.name}
              </span>
              {history.length === 0 && <span className="badge badge-info text-xs">All Provinces</span>}
              {viewState.level === "province" && <span className="badge badge-success text-xs">Detailed View</span>}
            </div>
          </div>

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-20 flex-col gap-4">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <span className="text-lg font-medium text-gray-700">Loading map data...</span>
              {viewState.level === "province" && (
                <span className="text-xs text-gray-500">Fetching detailed boundaries...</span>
              )}
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 text-red-500 font-bold p-4 text-center">
              {error}
            </div>
          )}

          <svg ref={svgRef} className="w-full h-full block"></svg>

          {!loading && (
            <div className="absolute bottom-4 left-4 bg-white/85 backdrop-blur-sm p-2 rounded shadow text-xs pointer-events-none z-10">
              <p><strong>Controls:</strong></p>
              <p>Scroll: Pan (Vertical)</p>
              <p>Shift + Scroll: Pan (Horizontal)</p>
              <p>Ctrl + Scroll: Zoom</p>
              <p>Click: Drill down</p>
            </div>
          )}

          {selectedTab === "cluster" && heatmapData && (
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded shadow text-xs z-10 min-w-48">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="inline-block h-3 w-3 rounded-full border border-base-300"
                  style={{ backgroundColor: heatmapData.clusterBaseColor }}
                />
                <p className="font-semibold">
                  Cluster {heatmapData.selectedClusterDisplay} {viewState.level === "province" ? "Province" : "Country"} Legend
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-5 rounded-sm border border-base-300"
                    style={{ backgroundColor: ZERO_CLUSTER_COLOR }}
                  />
                  <span>0</span>
                </div>
                {(viewState.level === "province"
                  ? activeProvinceLegendBins
                  : heatmapData.legendBins
                ).map((bin) => (
                  <div key={`${bin.min}-${bin.max}`} className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-5 rounded-sm border border-base-300"
                      style={{ backgroundColor: bin.color }}
                    />
                    <span>{bin.min}-{bin.max}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === "anomaly" && anomalyHeatmapData && (
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded shadow text-xs z-10 min-w-48">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="inline-block h-3 w-3 rounded-full border border-base-300"
                  style={{ backgroundColor: anomalyHeatmapData.diseaseBaseColor }}
                />
                <p className="font-semibold">
                  {anomalyHeatmapData.selectedDisease} Anomaly Legend
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-5 rounded-sm border border-base-300"
                    style={{ backgroundColor: ZERO_CLUSTER_COLOR }}
                  />
                  <span>0</span>
                </div>
                {anomalyHeatmapData.legendBins.map((bin) => (
                  <div key={`${bin.min}-${bin.max}`} className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-5 rounded-sm border border-base-300"
                      style={{ backgroundColor: bin.color }}
                    />
                    <span>{bin.min}-{bin.max}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </section>
  );
});

export default PhilippinesMap;
