import { useState, useEffect, useRef } from "react";
import * as topojson from "topojson-client";

// --- Types ---
export type ViewLevel = "country" | "province" | "municity";

export interface ViewState {
  level: ViewLevel;
  id: string | null;
  name: string;
}

export interface MapFeature {
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

export interface GeoData {
  features: MapFeature[];
  boundaries?: MapFeature[];
}

// --- Caching & Utilities ---

// Simple in-memory cache (singleton module-level)
const cache = new Map<string, any>();

// Concurrency Limiter
const pLimit = (concurrency: number) => {
  const queue: Array<() => void> = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      const fn = queue.shift();
      if (fn) fn();
    }
  };

  const run = async <T>(fn: () => Promise<T>): Promise<T> => {
    if (activeCount >= concurrency) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    activeCount++;
    try {
      return await fn();
    } finally {
      next();
    }
  };

  return run;
};

// Limit concurrent fetches (e.g., 5 at a time) to prevent browser stalling
const limit = pLimit(5);

// Fetch with retry and caching
const fetchWithRetry = async (urlTemplates: string[]) => {
  // Check cache first (using the first template as primary key logic is tricky, 
  // so we check cache for the *result* of successful fetch)
  // Actually, we cache by successful URL. 
  // But here we have templates.
  
  // Strategy: Try urls. If one works, cache the result keyed by that specific URL.
  // Wait, if we want to avoid network requests, we need to know WHICH url will work.
  // We don't. So we must cache by the "Intent".
  // Let's cache by the *first* template as the unique key for the resource "intent".
  const resourceKey = urlTemplates[0]; 
  if (cache.has(resourceKey)) {
      // console.log(`Cache hit: ${resourceKey}`);
      return cache.get(resourceKey);
  }

  for (const url of urlTemplates) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        // console.log(`Loaded and Cached: ${url}`);
        const data = await res.json();
        cache.set(resourceKey, data); // Cache it!
        return data;
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
    if (data.objects[keyPrefix]) {
      features = (topojson.feature(data as any, data.objects[keyPrefix]) as any).features;
    } else {
      const keys = Object.keys(data.objects);
      const matchingKey = keys.find((k) => k.startsWith(keyPrefix));
      if (matchingKey) {
        features = (topojson.feature(data as any, data.objects[matchingKey]) as any).features;
      } else if (keys.length > 0) {
        features = (topojson.feature(data as any, data.objects[keys[0]]) as any).features;
      }
    }
  }
  return features;
};

// --- Hook ---

export const useGeoData = (viewState: ViewState) => {
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use a ref to track if component is mounted to avoid setting state on unmount
  const isMounted = useRef(true);
  useEffect(() => {
      isMounted.current = true;
      return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      // Don't clear geoData immediately to prevent flashing? 
      // Actually, standard behavior is to clear or show loading overlay.
      // We will clear it to avoid showing mismatching map.
      setGeoData(null); 

      try {
        if (viewState.level === "country") {
          // --- Country View ---
          const countryData = await fetchWithRetry([
            "/topojson/country/country.topo.0.01.json",
          ]);

          if (!countryData) throw new Error("Failed to load country data");

          let regions = [];
          if (countryData.objects["PH_Adm1_Regions.shp"]) {
            regions = (topojson.feature(countryData as any, countryData.objects["PH_Adm1_Regions.shp"]) as any).features;
          } else {
            regions = loadFeaturesFromObject(countryData, "PH_Adm1_Regions");
          }

          const regionIds = regions.map((f: any) => f.properties.adm1_psgc);

          // Use limit() for concurrent fetching
          const provincePromises = regionIds.map((id: number) =>
            limit(async () => {
              const data = await fetchWithRetry([
                `/topojson/region/provdists-region-${id}.topo.0.01.json`,
              ]);
              return loadFeaturesFromObject(data, `provdists-region-${id}`);
            })
          );

          const provincesArrays = await Promise.all(provincePromises);
          
          if (!isMounted.current) return;

          const allProvinces = provincesArrays.flat();
          setGeoData({ features: allProvinces });

        } else if (viewState.level === "province") {
          // --- Province View ---
          const provinceData = await fetchWithRetry([
            `/topojson/provdists/municities-provdist-${viewState.id}.topo.0.1.json`,
          ]);

          

          if (!provinceData) throw new Error(`Failed to load province data for ID ${viewState.id}`);

          const municipalities = loadFeaturesFromObject(provinceData, `municities-provdist-${viewState.id}`) as MapFeature[];

          if (municipalities.length === 0) {
            if (isMounted.current) {
                setGeoData({ features: [] });
                setLoading(false);
            }
            return;
          }

          const municityIds = municipalities
            .map((f) => {
              if (f.properties.adm3_psgc) return f.properties.adm3_psgc;
              if ((f as any).id) return (f as any).id;
              return null;
            })
            .filter((id) => id !== null);

          // Use limit() for concurrent fetching of barangays
          const barangayPromises = municityIds.map((id) =>
            limit(async () => {
              const data = await fetchWithRetry([
                `/topojson/municities/bgysubmuns-municity-${id}.topo.0.1.json`,
              ]);
              return loadFeaturesFromObject(data, `bgysubmuns-municity-${id}`);
            })
          );

          const barangayArrays = await Promise.all(barangayPromises);
          const allBarangays = barangayArrays.flat().filter((f) => !!f);

          if (!isMounted.current) return;

          if (allBarangays.length === 0) {
             console.warn("No barangay data found. Falling back to Municipalities.");
             setGeoData({ features: municipalities });
          } else {
             setGeoData({
               features: allBarangays,
               boundaries: municipalities,
             });
          }
        }
        
        if (isMounted.current) setLoading(false);
      } catch (err) {
        console.error("Fetch Error:", err);
        if (isMounted.current) {
            setError(err instanceof Error ? err.message : "An unknown error occurred");
            setLoading(false);
        }
      }
    };

    fetchData();
  }, [viewState]); // depend only on viewState

  return { geoData, loading, error };
};
