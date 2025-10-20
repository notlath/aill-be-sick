"use server";

export type LocationData = {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
};

/**
 * Get location details from latitude/longitude using reverse geocoding
 * Using OpenStreetMap Nominatim API (free, no API key required)
 */
export const getLocationDetails = async (
  latitude: number,
  longitude: number
): Promise<{ success?: LocationData; error?: string }> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
      {
        headers: {
          "User-Agent": "AIllBeSick/1.0", // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      return { error: "Failed to fetch location details" };
    }

    const data = await response.json();

    return {
      success: {
        latitude,
        longitude,
        city:
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          data.address?.municipality,
        region: data.address?.state || data.address?.province,
      },
    };
  } catch (error) {
    console.error(`Error fetching location details: ${error}`);
    return { error: `Error fetching location details: ${error}` };
  }
};

/**
 * Get location from IP address (fallback if browser geolocation is denied)
 * Using ipapi.co free tier (no API key required for basic usage)
 */
export const getLocationFromIP = async (): Promise<{
  success?: LocationData;
  error?: string;
}> => {
  try {
    const response = await fetch("https://ipapi.co/json/");

    if (!response.ok) {
      return { error: "Failed to fetch location from IP" };
    }

    const data = await response.json();

    if (data.error) {
      return { error: data.reason || "Failed to fetch location from IP" };
    }

    return {
      success: {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        region: data.region,
      },
    };
  } catch (error) {
    console.error(`Error fetching location from IP: ${error}`);
    return { error: `Error fetching location from IP: ${error}` };
  }
};
