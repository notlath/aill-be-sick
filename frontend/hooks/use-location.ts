"use client";

import { useState, useCallback } from "react";
import { getLocationDetails, LocationData } from "@/utils/location";

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

          await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate network delay

          // Get location details from coordinates using server action
          try {
            const result = await getLocationDetails(latitude, longitude);

            if (result.success) {
              setLocation(result.success);
            } else {
              // Fallback: just use coordinates
              setLocation({
                lat: latitude,
                lng: longitude,
              });
            }
          } catch (err) {
            console.error("Error getting location coordinate details:", err);
            // Fallback: just use coordinates
            setLocation({ lat: latitude, lng: longitude });
          }

          setLoading(false);
        },
        async (err) => {
          console.error("Geolocation error:", err);

          switch (err.code) {
            case err.PERMISSION_DENIED:
              setError("Permission denied. Please allow location access.");
              break;
            case err.POSITION_UNAVAILABLE:
              setError("Position unavailable. Please try again.");
              break;
            case err.TIMEOUT:
              setError("Location request timed out. Please try again.");
              break;
            default:
              setError("An unknown error occurred while fetching location.");
          }

          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    } else {
      // Browser doesn't support geolocation
      console.error("Geolocation not supported");
      setError("Geolocation not supported");
      setLoading(false);
    }
  }, []);

  return { location, error, loading, requestLocation };
};
