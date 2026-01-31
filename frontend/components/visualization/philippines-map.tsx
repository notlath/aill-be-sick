"use client";

import { useEffect, useRef, useState, memo } from "react";
import * as d3 from "d3";
import { useGeoData, ViewState, ViewLevel, MapFeature } from "@/hooks/use-geo-data";

// Helper to determine next level in the flow
const getNextLevel = (current: ViewLevel): ViewLevel | null => {
  // Country (Provinces) -> Province (Barangays)
  if (current === "country") return "province";
  // Province (Barangays) -> End of line
  return null;
};

const PhilippinesMap = memo(() => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [viewState, setViewState] = useState<ViewState>({
    level: "country",
    id: null,
    name: "Philippines (Provinces)",
  });
  
  const [history, setHistory] = useState<ViewState[]>([]);
  
  // Use Custom Hook for Data Fetching
  const { geoData, loading, error } = useGeoData(viewState);

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
                 projection.center([122, 12]).scale(1000).translate([width/2, height/2]);
            }
        }

        const pathGenerator = d3.geoPath().projection(projection);
        
        // Color Scale
        // Use a consistent color scale, or randomize it for demo
        // For choropleth, we ideally map actual data values here later on.
        // For now, ordinal scale based on name/ID is fine for visualization.
        const colorScale = d3.scaleOrdinal(d3.schemeBlues[9]);

        // Create Group Hierarchy
        // g (Zoomable)
        //   -> layer-features (Barangays/Provinces)
        //   -> layer-boundaries (Cities Overlay)
        const g = svg.append("g");
        
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([1, 20])
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

                g.select(".layer-features").selectAll("path").attr("stroke-width", baseFeatureStroke / k);
                g.select(".layer-boundaries").selectAll("path").attr("stroke-width", baseBoundaryStroke / k);
            });

        svg.call(zoom as any);

        // --- Render Features Layer ---
        const featureLayer = g.append("g").attr("class", "layer-features");

        // Tooltip (re-created per render to keep simple scope)
        const tooltip = d3.select("body").selectAll(".map-tooltip").data([0]).join("div")
            .attr("class", "map-tooltip absolute z-50 hidden p-2 text-xs text-white bg-black/80 rounded pointer-events-none")
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

        // --- Render Boundaries Layer (Overlay) ---
        const boundaryLayer = g.append("g").attr("class", "layer-boundaries").style("pointer-events", "none");

        if (geoData.boundaries) {
            boundaryLayer.selectAll("path")
                .data(geoData.boundaries)
                .join("path")
                .attr("d", pathGenerator as any)
                .attr("fill", "none")
                .attr("stroke", "#444") // Darker grey for boundaries
                .attr("stroke-width", 0.5) 
                .attr("stroke-opacity", 0.8)
                .attr("stroke-linejoin", "round");
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
  }, [geoData, viewState]); // Re-render when data or view changes

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
});

export default PhilippinesMap;
