"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";

// Define view levels
// "country" = Composite view of ALL provinces
// "province" = Composite view of ALL barangays in that province
// "municity" = (Skipped in UI flow, but data used internally)
type ViewLevel = "country" | "province" | "municity";

interface ViewState {
  level: ViewLevel;
  id: string | null;
  name: string;
}

interface MapFeature {
  type: "Feature";
  properties: {
    adm1_psgc: number;
    adm1_en: string;
    adm2_psgc?: number;
    adm2_en?: string;
    adm3_psgc?: number;
    adm3_en?: string;
    adm4_psgc?: number;
    adm4_en?: string;
    [key: string]: any;
  };
  geometry: any;
}

interface GeoData {
    features: MapFeature[];
    boundaries?: MapFeature[]; // Overlay boundaries (e.g., Municipalities on top of Barangays)
}

const PhilippinesMap = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [viewState, setViewState] = useState<ViewState>({
    level: "country",
    id: null,
    name: "Philippines (Provinces)",
  });
  
  const [history, setHistory] = useState<ViewState[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading map data...");
  const [error, setError] = useState<string | null>(null);
  const [geoData, setGeoData] = useState<GeoData | null>(null);

  // Helper to determine next level in the NEW flow
  const getNextLevel = (current: ViewLevel): ViewLevel | null => {
    // Country (Provinces) -> Province (Barangays)
    if (current === "country") return "province";
    // Province (Barangays) -> End of line
    return null;
  };

  // Generic fetch with retry logic covering various naming conventions
  const fetchWithRetry = async (urlTemplates: string[]) => {
      for (const url of urlTemplates) {
          try {
              const res = await fetch(url);
              if (res.ok) {
                   console.log(`Loaded: ${url}`);
                   return await res.json();
              }
          } catch (e) {
              // ignore
          }
      }
      return null;
  };

  const loadFeaturesFromObject = (data: any, keyPrefix: string) => {
      if (!data) return [];
      let features: any[] = [];
      if (data.objects) {
          // Exact match
          if (data.objects[keyPrefix]) {
               features = (topojson.feature(data as any, data.objects[keyPrefix]) as any).features;
          } else {
               // Prefix match
               const keys = Object.keys(data.objects);
               const matchingKey = keys.find(k => k.startsWith(keyPrefix));
               if (matchingKey) {
                   features = (topojson.feature(data as any, data.objects[matchingKey]) as any).features;
               } else if (keys.length > 0) {
                   // Fallback: first object
                   features = (topojson.feature(data as any, data.objects[keys[0]]) as any).features;
               }
          }
      }
      return features;
  };

  // Data Fetching Effect
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setGeoData(null);

      try {
        if (viewState.level === "country") {
            // --- Country View: Load All Provinces ---
            setLoadingMessage("Loading Provinces...");
            console.log("Fetching Country Level (Composite Provinces)...");
            
            // Try different country file names just in case
            const countryData = await fetchWithRetry([
                "/topojson/country/country.topo.0.01.json"
            ]);

            if (!countryData) throw new Error("Failed to load country data");
            
            // Handle potentially different object key for Regions
            let regions = [];
            if (countryData.objects["PH_Adm1_Regions.shp"]) {
                regions = (topojson.feature(countryData as any, countryData.objects["PH_Adm1_Regions.shp"]) as any).features;
            } else {
                 // Try generic fallback
                 regions = loadFeaturesFromObject(countryData, "PH_Adm1_Regions");
            }

            const regionIds = regions.map((f: any) => f.properties.adm1_psgc);
            
            const provincePromises = regionIds.map(async (id: number) => {
                // Try multiple patterns for Region files
                const data = await fetchWithRetry([
                    `/topojson/region/provdists-region-${id}.topo.0.1.json`,
                    `/topojson/region/provdists-region-${id}.topo.0.01.json`,
                ]);
                return loadFeaturesFromObject(data, `provdists-region-${id}`);
            });

            const provincesArrays = await Promise.all(provincePromises);
            const allProvinces = provincesArrays.flat();
            setGeoData({ features: allProvinces });

        } else if (viewState.level === "province") {
            // --- Province View: Load All Barangays ---
            setLoadingMessage("Loading Barangays... (This may take a moment)");
            console.log(`Fetching Barangays for Province ID: ${viewState.id}`);

            // 1. Fetch Province file
            // New pattern seems to be .topo.0.1.json for provdists
            const provinceData = await fetchWithRetry([
                `/topojson/provdists/municities-provdist-${viewState.id}.topo.0.1.json`,
                `/topojson/provdists/municities-provdist-${viewState.id}.topo.0.01.json`,
                `/topojson/provdists/municities-provdist-${viewState.id}.topo.0.001.json`
            ]);
            
            if (!provinceData) {
                throw new Error(`Failed to load province data for ID ${viewState.id}`);
            }

            const municipalities = loadFeaturesFromObject(provinceData, `municities-provdist-${viewState.id}`) as MapFeature[];
            
            if (municipalities.length === 0) {
                 console.warn("No municipalities found in province file.");
                 setGeoData({ features: [] });
                 setLoading(false);
                 return;
            }

            console.log(`Found ${municipalities.length} municipalities.`);

            // 2. Fetch Barangays
            const municityIds = municipalities.map(f => {
                if (f.properties.adm3_psgc) return f.properties.adm3_psgc;
                if ((f as any).id) return (f as any).id;
                return null;
            }).filter(id => id !== null);

            
            const barangayPromises = municityIds.map(async (id) => {
                 // New pattern seems to be .0.1.json for municities
                 const data = await fetchWithRetry([
                     `/topojson/municities/bgysubmuns-municity-${id}.topo.0.1.json`,
                     `/topojson/municities/bgysubmuns-municity-${id}.0.1.json`,
                     `/topojson/municities/bgysubmuns-municity-${id}.topo.0.01.json`
                 ]);
                 return loadFeaturesFromObject(data, `bgysubmuns-municity-${id}`);
            });

            const barangayArrays = await Promise.all(barangayPromises);
            const allBarangays = barangayArrays.flat().filter(f => !!f);

            if (allBarangays.length === 0) {
                console.warn("No barangay data found. Falling back to Municipalities.");
                setGeoData({ features: municipalities });
            } else {
                // Pass both barangays AND municipalities (as boundaries)
                setGeoData({ 
                    features: allBarangays,
                    boundaries: municipalities 
                });
            }
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Fetch Error:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        setLoading(false);
      }
    };

    fetchData();
  }, [viewState]);

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
        const container = containerRef.current!;
        const svg = d3.select(svgRef.current);
        const width = container.clientWidth;
        const height = container.clientHeight;

        svg.attr("width", width).attr("height", height);
        
        svg.selectAll("g").remove();

        let projection: d3.GeoProjection;

        if (viewState.level === "country") {
            projection = d3.geoMercator()
                .center([122, 12]) 
                .translate([width / 2, height / 2])
                .scale(height * 6.5);
        } else {
            projection = d3.geoMercator();
            if (geoData.features.length > 0) {
                projection.fitExtent([[20, 20], [width - 20, height - 20]], {
                    type: "FeatureCollection",
                    features: geoData.features
                } as any);
            } else {
                 projection.center([122, 12]).scale(1000).translate([width/2, height/2]);
            }
        }

        const pathGenerator = d3.geoPath().projection(projection);
        const colorScale = d3.scaleOrdinal(d3.schemeBlues[9]);

        // Create main group for Zoom
        const g = svg.append("g");

        // 1. Layer: Features (Barangays or Provinces)
        const featureLayer = g.append("g").attr("class", "layer-features");

        // Tooltip setup
        const tooltip = d3.select("body").append("div")
            .attr("class", "absolute z-50 hidden p-2 text-xs text-white bg-black/80 rounded pointer-events-none")
            .style("top", "0")
            .style("left", "0");

        featureLayer.selectAll("path")
            .data(geoData.features)
            .join("path")
            .attr("d", pathGenerator as any)
            .attr("fill", (d) => {
                 const name = d.properties.adm4_en || d.properties.adm3_en || d.properties.adm2_en || d.properties.adm1_en || "unknown";
                 return colorScale(name);
            })
            .attr("stroke", "#fff")
            .attr("stroke-width", viewState.level === "province" ? 0.05 : 0.2) 
            .attr("class", "hover:opacity-80 transition-opacity cursor-pointer")
            .on("click", (event, d) => {
                event.stopPropagation();
                handleFeatureClick(d);
            })
            .on("mousemove", (event, d) => {
                const name = d.properties.adm4_en || d.properties.adm3_en || d.properties.adm2_en || d.properties.adm1_en || "Feature";
                tooltip
                    .style("display", "block")
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px")
                    .text(name);
            })
            .on("mouseleave", () => {
                tooltip.style("display", "none");
            });

        // 2. Layer: Boundaries Overlay (Municipalities on top of Barangays)
        const boundaryLayer = g.append("g").attr("class", "layer-boundaries").style("pointer-events", "none");

        if (geoData.boundaries) {
            boundaryLayer.selectAll("path")
                .data(geoData.boundaries)
                .join("path")
                .attr("d", pathGenerator as any)
                .attr("fill", "none")
                .attr("stroke", "#444") // Dark grey for improved visibility
                .attr("stroke-width", 0.5) // Thicker than barangay borders
                .attr("stroke-opacity", 0.8)
                .attr("stroke-linejoin", "round");
        }

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([1, 20])
            .filter((event) => {
                if (event.type === "wheel" && !event.ctrlKey) return false;
                return true;
            })
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
                
                // Scale stroke width to remain consistent-ish visually, but getting thinner as we zoom in
                // Barangays need to get very thin
                const k = event.transform.k;
                const baseFeatureStroke = viewState.level === "province" ? 0.05 : 0.2;
                const baseBoundaryStroke = 0.5;

                featureLayer.selectAll("path").attr("stroke-width", baseFeatureStroke / k);
                
                if (geoData.boundaries) {
                    boundaryLayer.selectAll("path").attr("stroke-width", baseBoundaryStroke / k);
                }
            });

        svg.call(zoom as any);

        if (shouldResetZoom) {
            svg.call(zoom.transform as any, d3.zoomIdentity); 
        }

        return () => { // Cleanup tooltip on unmount
            tooltip.remove();
        };
    };

    const cleanup = render(true); // Initial render
    
    // We can't return cleanup from useEffect easily inside render...
    // But we need to cleanup tooltip if component unmounts.
    
    const resizeObserver = new ResizeObserver(() => {
        render(false); 
    });
    
    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }

    return () => {
        resizeObserver.disconnect();
        d3.selectAll(".absolute.z-50.hidden").remove(); // Remove tooltips
    };
  }, [geoData, viewState]);

  // Handle Drill-down
  const handleFeatureClick = (feature: MapFeature) => {
    const props = feature.properties;
    const nextLevel = getNextLevel(viewState.level);
    
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
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setViewState(previousState);
  };

  return (
    <div className="flex flex-col gap-4">
        {/* Navigation / Header */}
        <div className="flex items-center gap-2 text-sm">
            {history.length > 0 && (
                <button 
                    onClick={handleBack}
                    className="btn btn-sm btn-outline"
                >
                    &larr; Back
                </button>
            )}
            <span className="font-semibold text-lg">
                {viewState.name}
            </span>
             {history.length === 0 && <span className="badge badge-info text-xs">All Provinces View</span>}
             {viewState.level === "province" && <span className="badge badge-success text-xs">All Barangays View</span>}
        </div>

        {/* Map Container */}
        <div ref={containerRef} className="w-full h-[800px] border border-gray-200 rounded-lg shadow-sm bg-base-100 overflow-hidden relative">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-20 flex-col gap-4">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                    <span className="text-lg font-medium text-gray-700">{loadingMessage}</span>
                    {viewState.level === "province" && (
                        <span className="text-xs text-gray-500">Fetching detailed barangay data...</span>
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
                <div className="absolute bottom-4 left-4 bg-white/90 p-2 rounded shadow text-xs pointer-events-none z-10">
                    <p><strong>Controls:</strong></p>
                    <p>Scroll: Pan (Vertical)</p>
                    <p>Shift + Scroll: Pan (Horizontal)</p>
                    <p>Ctrl + Scroll: Zoom</p>
                    <p>Click: Drill down</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default PhilippinesMap;
