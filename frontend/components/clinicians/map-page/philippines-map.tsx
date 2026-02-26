"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MapFeature,
  useGeoData,
  ViewLevel,
  ViewState,
} from "@/hooks/use-geo-data";
import { useUserLocation } from "@/hooks/use-location";
import { DiseaseMapData } from "@/utils/map-data";
import * as d3 from "d3";
import { ChevronLeft, Navigation, Search } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

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
  t: "province" | "city" | "barangay";
  p: number; // Parent ID (Province ID)
  c?: number; // City ID (if barangay)
  lbl?: string; // Display Label
};

// Province to Region mapping - each province belongs to one region
const PROVINCE_TO_REGION: Record<string, string> = {
  // NCR (National Capital Region)
  "Metro Manila": "NCR",
  "National Capital Region": "NCR",
  "NCR, City of Manila, First District (Not a Province)": "NCR",
  "NCR, Second District (Not a Province)": "NCR",
  "NCR, Third District (Not a Province)": "NCR",
  "NCR, Fourth District (Not a Province)": "NCR",

  // CAR (Cordillera Administrative Region)
  "Abra": "Cordillera",
  "Apayao": "Cordillera",
  "Benguet": "Cordillera",
  "Ifugao": "Cordillera",
  "Kalinga": "Cordillera",
  "Mountain Province": "Cordillera",
  "Nueva Vizcaya": "Cordillera",
  "Quirino": "Cordillera",

  // Region I (Ilocos)
  "Ilocos Norte": "Region I",
  "Ilocos Sur": "Region I",
  "La Union": "Region I",
  "Pangasinan": "Region I",

  // Region II (Cagayan Valley)
  "Batanes": "Region II",
  "Cagayan": "Region II",
  "Isabela": "Region II",

  // Region III (Central Luzon)
  "Aurora": "Region III",
  "Bataan": "Region III",
  "Bulacan": "Region III",
  "Nueva Ecija": "Region III",
  "Pampanga": "Region III",
  "Tarlac": "Region III",
  "Zambales": "Region III",

  // Region IV-A (CALABARZON)
  "Batangas": "CALABARZON",
  "Cavite": "CALABARZON",
  "Laguna": "CALABARZON",
  "Quezon": "CALABARZON",
  "Rizal": "CALABARZON",

  // Region IV-B (MIMAROPA)
  "Marinduque": "Region IV-B",
  "Occidental Mindoro": "Region IV-B",
  "Oriental Mindoro": "Region IV-B",
  "Palawan": "Region IV-B",
  "Romblon": "Region IV-B",

  // Region V (Bicol)
  "Albay": "Region V",
  "Camarines Norte": "Region V",
  "Camarines Sur": "Region V",
  "Catanduanes": "Region V",
  "Masbate": "Region V",
  "Sorsogon": "Region V",

  // Region VI (Western Visayas)
  "Aklan": "Western Visayas",
  "Antique": "Western Visayas",
  "Capiz": "Western Visayas",
  "Guimaras": "Western Visayas",
  "Iloilo": "Western Visayas",
  "Negros Occidental": "Western Visayas",

  // Region VII (Central Visayas)
  "Bohol": "Central Visayas",
  "Cebu": "Central Visayas",
  "Negros Oriental": "Central Visayas",
  "Siquijor": "Central Visayas",

  // Region VIII (Eastern Visayas)
  "Biliran": "Region VIII",
  "Eastern Samar": "Region VIII",
  "Leyte": "Region VIII",
  "Northern Samar": "Region VIII",
  "Samar": "Region VIII",
  "Southern Leyte": "Region VIII",

  // Region IX (Zamboanga Peninsula)
  "Zamboanga del Norte": "Zamboanga Peninsula",
  "Zamboanga del Sur": "Zamboanga Peninsula",
  "Zamboanga Sibugay": "Zamboanga Peninsula",
  "City of Isabela (Not a Province)": "Zamboanga Peninsula",

  // Region X (Northern Mindanao)
  "Bukidnon": "Northern Mindanao",
  "Camiguin": "Northern Mindanao",
  "Lanao del Norte": "Northern Mindanao",
  "Misamis Occidental": "Northern Mindanao",
  "Misamis Oriental": "Northern Mindanao",

  // Region XI (Davao)
  "Davao de Oro": "Davao Region",
  "Davao del Norte": "Davao Region",
  "Davao del Sur": "Davao Region",
  "Davao Occidental": "Davao Region",
  "Davao Oriental": "Davao Region",

  // Region XII (SOCCSKSARGEN)
  "Cotabato": "SOCCSKSARGEN",
  "Sarangani": "SOCCSKSARGEN",
  "South Cotabato": "SOCCSKSARGEN",
  "Sultan Kudarat": "SOCCSKSARGEN",
  "North Cotabato": "SOCCSKSARGEN",

  // Region XIII (Caraga)
  "Agusan del Norte": "Region XIII",
  "Agusan del Sur": "Region XIII",
  "Dinagat Islands": "Region XIII",
  "Surigao del Norte": "Region XIII",
  "Surigao del Sur": "Region XIII",

  // BARMM
  "Basilan": "BARMM",
  "Lanao del Sur": "BARMM",
  "Maguindanao": "BARMM",
  "Maguindanao del Norte": "BARMM",
  "Maguindanao del Sur": "BARMM",
  "Sulu": "BARMM",
  "Tawi-Tawi": "BARMM",
};

type PhilippinesMapProps = {
  selectedTab?: "disease" | "cluster" | "anomaly";
  selectedCluster?: string;
  diseaseData?: DiseaseMapData;
};

const HEATMAP_COLORS = [
  "#f1f5f9", // Gray-100 for 0
  "#ffffcc", // 1-5
  "#ffeda0", // 6-10
  "#fed976", // 11-25
  "#feb24c", // 26-50
  "#fd8d3c", // 51-100
  "#fc4e2a", // 101-200
  "#e31a1c", // 201-500
  "#bd0026", // 501-1000
  "#800026", // 1000+
];

const HEATMAP_LABELS = [
  "0",
  "1-5",
  "6-10",
  "11-25",
  "26-50",
  "51-100",
  "101-200",
  "201-500",
  "501-1000",
  "1000+",
];

const PhilippinesMap = memo(
  ({ selectedTab, selectedCluster, diseaseData }: PhilippinesMapProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [viewState, setViewState] = useState<ViewState>({
      level: "country",
      id: null,
      name: "Philippines (Provinces)",
    });

    const [history, setHistory] = useState<ViewState[]>([]);
    const [zoomLevel, setZoomLevel] = useState<"region" | "city">("region");
    const [selectedRegionForCity, setSelectedRegionForCity] = useState<string | null>(null);

    // Reset zoom level when returning to country view
    useEffect(() => {
      if (viewState.level === "country") {
        setZoomLevel("region");
        setSelectedRegionForCity(null);
        // Reset debug flag
        const globalWindow = window as any;
        globalWindow.cityDebugLogged = false;
      }
    }, [viewState.level]);

    // Reset debug flag when zoom level changes
    useEffect(() => {
      const globalWindow = window as any;
      globalWindow.cityDebugLogged = false;
    }, [zoomLevel]);

    // --- Search State ---
    const [searchIndex, setSearchIndex] = useState<SearchItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [highlightId, setHighlightId] = useState<number | null>(null);
    const [searchLoading, setSearchLoading] = useState(true);

    // --- User Location State ---
    const {
      location: userLocation,
      error: locationError,
      loading: locationLoading,
      requestLocation,
    } = useUserLocation();

    // Use Custom Hook for Data Fetching
    const { geoData, loading, error } = useGeoData(viewState);

    // --- Load Search Index ---
    useEffect(() => {
      fetch("/search-index.json")
        .then((res) => res.json())
        .then((data) => {
          setSearchIndex(data);
          setSearchLoading(false);
        })
        .catch((err) => {
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
      const results = searchIndex
        .filter((item) =>
          (item.lbl || item.l).toLowerCase().includes(lowerQuery),
        )
        .slice(0, 20);

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
      if (viewState.level === "country") {
        provinceName = "Philippines (Provinces)";
      }

      let newName = provinceName;

      // If highlighting, user wants context (City, etc.)
      if (highlightId && viewState.level === "province") {
        // Try to find the highlighted item in features or boundaries

        let foundName = null;
        let cityName = null;

        // Check Boundaries (Cities)
        const boundary = geoData.boundaries?.find((b) => {
          const bid = b.properties.adm3_psgc || (b as any).id;
          return bid === highlightId;
        });

        if (boundary) {
          foundName = boundary.properties.adm3_en; // Marikina City
          // If found, title: "Marikina City, Province Name"
        } else {
          // Check Features (Barangays)
          const feature = geoData.features.find((f) => {
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
      if (
        viewState.name === "Loading..." ||
        (highlightId && viewState.name !== newName)
      ) {
        setViewState((prev) => ({ ...prev, name: newName }));
      } else if (
        viewState.name !== newName &&
        !highlightId &&
        viewState.level === "province"
      ) {
        // Also update if we just loaded the province and name is generic/outdated
        setViewState((prev) => ({ ...prev, name: newName }));
      }
    }, [geoData, loading, highlightId, viewState.level, viewState.name]);

    const handleSearchSelect = (item: SearchItem) => {
      setSearchQuery(""); // Clear input ? Or keep it? Let's clear to show map.
      setIsSearching(false);

      // 1. Set Highlight
      setHighlightId(item.i);

      // 2. Drill Down Logic

      if (item.t === "province") {
        if (viewState.id !== item.i.toString()) {
          setHistory((prev) => [...prev, viewState]);
          setViewState({
            level: "province",
            id: item.i.toString(),
            name: item.l, // Set Name initially from search index
          });
        }
      } else if (item.t === "city" || item.t === "barangay") {
        const provinceId = item.p;

        if (viewState.id !== provinceId.toString()) {
          setHistory((prev) => [...prev, viewState]);
          setViewState({
            level: "province",
            id: provinceId.toString(),
            name: "Loading...", // Will be updated by useEffect
          });
        }
      }
    };

    // --- Auto-zoom on Location Detection ---
    useEffect(() => {
      if (userLocation && searchIndex.length > 0) {
        // Try to find the barangay first, then city, then province
        let match: SearchItem | undefined;
        let searchQuery = "";

        if (userLocation.barangay) {
          // Sometimes nominatim gives us "Barangay X", sometimes just "X"
          const bgy = userLocation.barangay.replace(/Barangay |Brgy\. /gi, "");
          searchQuery = bgy;
          match = searchIndex.find(
            (item) =>
              item.t === "barangay" &&
              item.l.toLowerCase().includes(bgy.toLowerCase())
          );
        }

        if (!match && userLocation.city) {
          const city = userLocation.city.replace(/ City| Municipality/gi, "");
          if (!searchQuery) searchQuery = city;
          match = searchIndex.find(
            (item) =>
              item.t === "city" &&
              item.l.toLowerCase().includes(city.toLowerCase())
          );
        }

        if (!match && userLocation.province) {
          const prov = userLocation.province.replace(/ Province/gi, "");
          if (!searchQuery) searchQuery = prov;
          match = searchIndex.find(
            (item) =>
              item.t === "province" &&
              item.l.toLowerCase().includes(prov.toLowerCase())
          );
        }

        if (match) {
          handleSearchSelect(match);
        } else {
          console.log("Location detected but couldn't map to search index:", userLocation);
        }
      }
    }, [userLocation, searchIndex]);

    // Persistent Ctrl+Scroll Prevention Listener
    useEffect(() => {
      const preventBrowserZoom = (e: WheelEvent) => {
        if (e.ctrlKey) e.preventDefault();
      };

      const svgNode = svgRef.current;
      if (svgNode) {
        svgNode.addEventListener("wheel", preventBrowserZoom, {
          passive: false,
        });
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
          projection = d3
            .geoMercator()
            .center([122, 12])
            .translate([width / 2, height / 2])
            .scale(height * 6.5);
        } else {
          projection = d3.geoMercator();
          if (geoData.features.length > 0) {
            // Fit to features
            projection.fitExtent(
              [
                [20, 20],
                [width - 20, height - 20],
              ],
              {
                type: "FeatureCollection",
                features: geoData.features,
              } as any,
            );
          } else {
            projection
              .center([122, 12])
              .scale(1000)
              .translate([width / 2, height / 2]);
          }
        }

        const pathGenerator = d3.geoPath().projection(projection);

        // Location name aliases for matching region names to database values
        // Each key should match a value in PROVINCE_TO_REGION for consistency
        const LOCATION_ALIASES: Record<string, string[]> = {
          "NCR": ["National Capital Region", "Metro Manila", "Metropolitan Manila", "NCR", "Manila", "National Capital Reg"],
          "Cordillera": ["Cordillera Administrative Region", "CAR", "Cordillera", "Cordillera Admin Region"],
          "BARMM": ["Bangsamoro Autonomous Region in Muslim Mindanao", "BARMM", "Bangsamoro", "ARMM"],
          "Region I": ["Ilocos Region", "Region 1", "Region I", "Ilocos", "Region I - Ilocos Region"],
          "Region II": ["Cagayan Valley", "Region 2", "Region II", "Region II - Cagayan Valley"],
          "Region III": ["Central Luzon", "Region 3", "Region III", "Region III - Central Luzon"],
          "CALABARZON": ["CALABARZON", "Region 4A", "Region IV-A", "Region 4-A", "Region IVA"],
          "Region IV-B": ["MIMAROPA", "Region 4B", "Region IV-B", "Region 4-B", "Region IVB"],
          "Region V": ["Bicol Region", "Region 5", "Region V", "Bicol", "Region V - Bicol Region"],
          "Western Visayas": ["Western Visayas", "Region 6", "Region VI", "Region VI - Western Visayas"],
          "Central Visayas": ["Central Visayas", "Region 7", "Region VII", "Region VII - Central Visayas"],
          "Region VIII": ["Eastern Visayas", "Region 8", "Region VIII", "Region VIII - Eastern Visayas"],
          "Zamboanga Peninsula": ["Zamboanga Peninsula", "Region 9", "Region IX", "Region IX - Zamboanga Peninsula"],
          "Northern Mindanao": ["Northern Mindanao", "Region 10", "Region X", "Region X - Northern Mindanao"],
          "Davao Region": ["Davao Region", "Region 11", "Region XI", "Region XI - Davao Region"],
          "SOCCSKSARGEN": ["SOCCSKSARGEN", "Region 12", "Region XII", "Region XII - SOCCSKSARGEN", "SOCSARGEN"],
          "Region XIII": ["Caraga", "Region 13", "Region XIII", "Region XIII - Caraga", "Caraga Region"],
        };

        // Get features early for debug logging
        const features = geoData.features;
        const boundaries = geoData.boundaries || [];

        // Color Scale - Get patient count for a region
        const getRegionCount = (regionName: string): number => {
          if (!diseaseData) return 0;

          // Normalize region name
          const searchRegion = regionName.toLowerCase().trim();

          // Try to find matching region in the data
          const match = diseaseData.byRegion.find(r => {
            const dataRegion = r.location.toLowerCase().trim();

            // 1. Direct exact match
            if (dataRegion === searchRegion) {
              return true;
            }

            // 2. Check if both are in the same alias group
            for (const [key, aliases] of Object.entries(LOCATION_ALIASES)) {
              const lowerAliases = aliases.map(a => a.toLowerCase());
              const lowerKey = key.toLowerCase();

              const dataInGroup = lowerAliases.includes(dataRegion) || lowerKey === dataRegion;
              const searchInGroup = lowerAliases.includes(searchRegion) || lowerKey === searchRegion;

              // Both database region and search region match the same alias group
              if (dataInGroup && searchInGroup) {
                return true;
              }
            }

            return false;
          });

          return match ? match.count : 0;
        };

        // Get patient count for a city
        const getCityCount = (cityName: string): number => {
          if (!diseaseData || !cityName) return 0;

          const normalizeCityName = (name: string): string => {
            // Remove common city type suffixes and normalize
            return name
              .toLowerCase()
              .trim()
              .replace(/\s+(city|municipality|municipal|prov\.?|province)$/i, '')
              .trim();
          };

          const searchCity = normalizeCityName(cityName);

          // Try exact match first (normalized)
          let match = diseaseData.byCity.find(c =>
            normalizeCityName(c.location) === searchCity
          );

          if (match) return match.count;

          // Try partial match (contains or is contained)
          match = diseaseData.byCity.find(c => {
            const dbCity = normalizeCityName(c.location);
            return dbCity.includes(searchCity) || searchCity.includes(dbCity);
          });

          if (match) return match.count;

          return 0;
        };

        // Create quantile-based color scale
        const colorScale = d3.scaleThreshold<number, string>()
          .domain([1, 6, 11, 26, 51, 101, 201, 501, 1001])
          .range(HEATMAP_COLORS);

        // Create Group Hierarchy
        const g = svg.append("g");

        const zoom = d3
          .zoom<SVGSVGElement, unknown>()
          .scaleExtent([1, 20])
          .filter((event) => {
            if (event.type === "wheel" && !event.ctrlKey) return false;
            return true;
          })
          .on("zoom", (event) => {
            g.attr("transform", event.transform);

            // Semantic Zoom: Scale stroke width
            const k = event.transform.k;
            const baseFeatureStroke =
              viewState.level === "province" ? 0.05 : 0.2;
            const baseBoundaryStroke = 0.5;
            const highlightStroke = 2.5; // Increased from 1.0 to 2.5

            g.select(".layer-features")
              .selectAll("path")
              .attr("stroke-width", baseFeatureStroke / k);
            g.select(".layer-boundaries")
              .selectAll("path")
              .attr("stroke-width", baseBoundaryStroke / k);
            // Keep highlight stroke consistent but thicker
            g.selectAll(".highlighted").attr(
              "stroke-width",
              highlightStroke / k,
            );
          });

        svg.call(zoom as any);

        // --- Render Features Layer ---

        const featureLayer = g.append("g").attr("class", "layer-features");

        // Tooltip
        const tooltip = d3
          .select("body")
          .selectAll(".map-tooltip")
          .data([0])
          .join("div")
          .attr(
            "class",
            "map-tooltip absolute z-50 hidden p-2 text-xs text-white bg-black/80 rounded pointer-events-none",
          )
          .style("top", "0")
          .style("left", "0");

        featureLayer
          .selectAll("path")
          .data(features)
          .join("path")
          .attr("d", pathGenerator as any)
          .attr("fill", (d) => {
            if (!diseaseData) return colorScale(0);

            // If in city zoom mode, color by city
            if (zoomLevel === "city") {
              // Try to get city from different property sources
              const adm2 = d.properties.adm2_en; // Province
              const adm3 = d.properties.adm3_en; // City
              const adm4 = d.properties.adm4_en; // Barangay or subdivision
              const adm1 = d.properties.adm1_en; // Region or municipality

              // Build list of candidates to try for city matching
              const cityCandidates = [adm3, adm4, adm1].filter(Boolean);

              let patientCount = 0;
              let matchedCity = null;

              // Try each candidate
              for (const candidate of cityCandidates) {
                if (candidate) {
                  const count = getCityCount(candidate);
                  if (count > 0) {
                    patientCount = count;
                    matchedCity = candidate;
                    break;
                  }
                }
              }

              // If no city match found, fall back to region coloring for city view
              if (patientCount === 0 && adm2) {
                const regionName = PROVINCE_TO_REGION[adm2];
                if (regionName) {
                  patientCount = getRegionCount(regionName);
                  matchedCity = regionName;
                }
              }

              // Debug first few features
              const globalWindow = window as any;
              if (!globalWindow.cityDebugLogged) {
                console.log(`[City View] Sample city mapping:`, {
                  adm1_en: adm1,
                  adm2_en: adm2,
                  adm3_en: adm3,
                  adm4_en: adm4,
                  cityCandidates: cityCandidates,
                  matchedCity: matchedCity,
                  patientCount: patientCount,
                  availableCities: diseaseData.byCity.slice(0, 5).map(c => c.location)
                });
                globalWindow.cityDebugLogged = true;
              }

              return colorScale(patientCount);
            }

            // Otherwise color by region (region view)
            const provinceName = d.properties.adm2_en;
            if (!provinceName) return colorScale(0);

            const regionName = PROVINCE_TO_REGION[provinceName];
            if (!regionName) {
              return colorScale(0);
            }

            const patientCount = getRegionCount(regionName);
            return colorScale(patientCount);
          })
          .attr("stroke", (d) => {
            // Check highlight for Feature Layer (Barangays usually)
            if (highlightId) {
              const id =
                d.properties.adm4_psgc ||
                d.properties.adm3_psgc ||
                d.properties.adm2_psgc;
              if (id === highlightId) return "#f59e0b"; // Amber-500
            }
            return "#fff";
          })
          .attr("stroke-width", (d) => {
            if (highlightId) {
              const id =
                d.properties.adm4_psgc ||
                d.properties.adm3_psgc ||
                d.properties.adm2_psgc;
              if (id === highlightId) return 0.05 * 10; // 10x thicker (was 5x)
            }
            return viewState.level === "province" ? 0.05 : 0.2;
          })
          .attr("class", (d) => {
            let cls = "hover:opacity-80 transition-opacity cursor-pointer";
            if (highlightId) {
              const id =
                d.properties.adm4_psgc ||
                d.properties.adm3_psgc ||
                d.properties.adm2_psgc;
              if (id === highlightId) cls += " highlighted z-10"; // z-10 doesn't work in SVG, order matters
            }
            return cls;
          })
          // Raise highlighted element to top
          .filter((d) => {
            const id =
              d.properties.adm4_psgc ||
              d.properties.adm3_psgc ||
              d.properties.adm2_psgc;
            return id === highlightId;
          })
          .raise() // Bring to front
          .each(function () {
            // Re-select to apply click/hover handlers to all, not just filtered
          });

        // Simple Click/Hover handlers for ALL features
        featureLayer
          .selectAll("path")
          .on("click", (event, d: any) => {
            event.stopPropagation();
            handleFeatureClick(d);
          })
          .on("mousemove", (event, d: any) => {
            let tooltipText = "";

            if (zoomLevel === "city") {
              // City view - use same matching logic as fill
              const adm2 = d.properties.adm2_en;
              const adm3 = d.properties.adm3_en;
              const adm4 = d.properties.adm4_en;
              const adm1 = d.properties.adm1_en;

              const cityCandidates = [adm3, adm4, adm1].filter(Boolean);

              let displayName = adm2 || "Feature";
              let cityCount = 0;

              // Try each candidate
              for (const candidate of cityCandidates) {
                if (candidate) {
                  const count = getCityCount(candidate);
                  if (count > 0) {
                    cityCount = count;
                    displayName = candidate;
                    break;
                  }
                }
              }

              tooltipText = cityCount > 0
                ? `${displayName}: ${cityCount} patient${cityCount !== 1 ? 's' : ''}`
                : displayName;
            } else {
              // Region view - show province name and regional patient count
              const provinceName = d.properties.adm2_en;
              const regionName = provinceName ? PROVINCE_TO_REGION[provinceName] : null;
              const displayName =
                d.properties.adm4_en ||
                d.properties.adm3_en ||
                provinceName ||
                d.properties.adm1_en ||
                "Feature";

              const caseCount = regionName ? getRegionCount(regionName) : 0;
              tooltipText = caseCount > 0
                ? `${displayName}: ${regionName} (${caseCount} patient${caseCount !== 1 ? 's' : ''})`
                : displayName;
            }

            tooltip
              .style("display", "block")
              .style("left", event.pageX + 10 + "px")
              .style("top", event.pageY - 10 + "px")
              .text(tooltipText);
          })
          .on("mouseleave", () => {
            tooltip.style("display", "none");
          });

        // --- Render Boundaries Layer (Overlay - Cities) ---
        const boundaryLayer = g
          .append("g")
          .attr("class", "layer-boundaries")
          .style("pointer-events", "none");

        if (boundaries) {
          boundaryLayer
            .selectAll("path")
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

        return () => {
          // specific cleanup if needed
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
    }, [geoData, viewState, containerRef, highlightId]); // Depend on highlightId

    // Handle Drill-down
    const handleFeatureClick = (feature: MapFeature) => {
      const props = feature.properties;

      // Clear highlight on manual click
      setHighlightId(null);

      // If in province view and clicking a city/barangay, zoom to city view
      if (viewState.level === "province" && zoomLevel === "region") {
        const cityName = props.adm3_en || props.adm2_en;
        const provinceName = props.adm2_en;
        const regionName = provinceName ? PROVINCE_TO_REGION[provinceName] : undefined;

        if (cityName && regionName) {
          setSelectedRegionForCity(regionName);
          setZoomLevel("city");
          setViewState(prev => ({
            ...prev,
            name: `${cityName} (${regionName})`
          }));
          return;
        }
      }

      // If in country view, drill down to province
      if (viewState.level === "country") {
        const nextLevel = getNextLevel(viewState.level);
        if (nextLevel === "province") {
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
              name: nextName,
            });
          }
        }
      }
    };

    const handleBack = () => {
      setHighlightId(null);

      // If in city view, go back to region view
      if (zoomLevel === "city") {
        setZoomLevel("region");
        setSelectedRegionForCity(null);
        return;
      }

      if (history.length === 0) return;
      const previousState = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setViewState(previousState);
    };

    return (
      <section className="space-y-4">        <div className="relative z-30">
        <Search className="absolute z-10 top-1/2 -translate-y-1/2 left-4 text-muted size-3.5" />
        <Input
          placeholder={
            searchLoading
              ? "Loading search data..."
              : "Search locations (e.g. Marikina, Quezon City)"
          }
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
                  <span className="text-xs text-muted capitalize">
                    {item.t}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

        <Card className="group hover:border-primary/30">
          {/* Map Container */}
          <div
            ref={containerRef}
            className="w-full h-[800px] overflow-hidden relative"
          >
            {/* Navigation / Header */}
            <div className="absolute top-4 left-4 flex items-center justify-between w-[calc(100%-2rem)] z-20">
              <div className="flex items-center gap-2 text-sm pointer-events-auto">
                {(history.length > 0 || zoomLevel === "city") && (
                  <button
                    onClick={handleBack}
                    className="btn btn-sm btn-soft bg-white/80 backdrop-blur-sm shadow-sm"
                  >
                    <ChevronLeft className="size-3.5" /> Back
                  </button>
                )}
                <span className="font-semibold text-lg bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded shadow-sm">
                  {viewState.name}
                </span>
                {history.length === 0 && zoomLevel === "region" && (
                  <span className="badge badge-info text-xs shadow-sm">
                    All Provinces
                  </span>
                )}
                {viewState.level === "province" && zoomLevel === "region" && (
                  <span className="badge badge-success text-xs shadow-sm">
                    Detailed View
                  </span>
                )}
                {zoomLevel === "city" && (
                  <span className="badge badge-warning text-xs shadow-sm">
                    City View
                  </span>
                )}
              </div>

              <div className="pointer-events-auto">
                <button
                  onClick={requestLocation}
                  disabled={locationLoading}
                  className="btn btn-sm bg-white/90 hover:bg-white text-primary border-none shadow-md backdrop-blur-sm"
                  title="Find my location"
                >
                  {locationLoading ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <Navigation className="size-4" />
                  )}
                  <span className="hidden sm:inline-block ml-1 text-xs font-semibold">
                    Find My Location
                  </span>
                </button>
                {locationError && (
                  <div className="absolute top-10 right-0 bg-error/90 text-white text-[10px] px-2 py-1 rounded shadow mt-1 whitespace-nowrap">
                    {locationError}
                  </div>
                )}
              </div>
            </div>

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-20 flex-col gap-4">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <span className="text-lg font-medium text-gray-700">
                  Loading map data...
                </span>
                {viewState.level === "province" && (
                  <span className="text-xs text-gray-500">
                    Fetching detailed boundaries...
                  </span>
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
              <>
                <div className="absolute bottom-4 left-4 bg-white/85 backdrop-blur-sm p-2 rounded shadow text-xs pointer-events-none z-10">
                  <p>
                    <strong>Controls:</strong>
                  </p>
                  <p>Scroll: Pan (Vertical)</p>
                  <p>Shift + Scroll: Pan (Horizontal)</p>
                  <p>Ctrl + Scroll: Zoom</p>
                  <p>Click: {zoomLevel === "region" ? "Drill down to city" : "Go back to region"}</p>
                </div>

                {/* Color Legend */}
                <div className="absolute bottom-4 right-4 bg-white/85 backdrop-blur-sm p-3 rounded shadow pointer-events-none z-10">
                  <p className="font-bold text-xs mb-1">Patient Count</p>
                  <div className="flex flex-col gap-1">
                    {HEATMAP_COLORS.map((color, idx) => (
                      <div key={color} className="flex items-center gap-2">
                        <div
                          className="w-6 h-4 rounded"
                          style={{ backgroundColor: color }}
                        ></div>
                        <span className="text-xs">{HEATMAP_LABELS[idx]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </section>
    );
  },
);

export default PhilippinesMap;
