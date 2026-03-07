"use client";

import { useEffect, useState } from "react";
import type { GeoJsonObject } from "geojson";

type UseGeoJsonDataResult = {
  geoData: GeoJsonObject | null;
  loading: boolean;
  error: string | null;
};

export const useGeoJsonData = (url: string): UseGeoJsonDataResult => {
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const fetchGeo = async () => {
      try {
        setLoading(true);
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Failed to load GeoJSON: ${res.status}`);
        }
        const data = (await res.json()) as GeoJsonObject;
        if (isMounted) {
          setGeoData(data);
          setError(null);
        }
      } catch (err) {
        if (!isMounted || controller.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setGeoData(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchGeo();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [url]);

  return { geoData, loading, error };
};
