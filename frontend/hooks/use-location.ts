"use client";

import { useState, useCallback } from "react";
import {
  LocationData,
  getLocationDetails,
  getLocationFromIP,
} from "@/utils/location";

export const useUserLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Try browser geolocation first
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // Get location details from coordinates using server action
          try {
            const result = await getLocationDetails(latitude, longitude);

            if (result.success) {
              setLocation(result.success);
            } else {
              // Fallback: just use coordinates
              setLocation({ latitude, longitude });
            }
          } catch (err) {
            console.error("Error getting location details:", err);
            // Fallback: just use coordinates
            setLocation({ latitude, longitude });
          }

          setLoading(false);
        },
        async (err) => {
          console.error("Geolocation error:", err);
          // Fallback to IP-based location
          try {
            const result = await getLocationFromIP();

            if (result.success) {
              setLocation(result.success);
            } else {
              setError(result.error || "Could not determine location");
            }
          } catch (ipErr) {
            console.error("IP location error:", ipErr);
            setError("Could not determine location");
          }
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      // Browser doesn't support geolocation, use IP fallback
      try {
        const result = await getLocationFromIP();

        if (result.success) {
          setLocation(result.success);
        } else {
          setError(result.error || "Geolocation not supported");
        }
      } catch (err) {
        console.error("IP location error:", err);
        setError("Geolocation not supported");
      }
      setLoading(false);
    }
  }, []);

  return { location, error, loading, requestLocation };
};
