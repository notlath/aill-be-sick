"use server";

export type LocationData = {
  lat: number;
  lng: number;
  address?: string;
};

/**
 * Get location details from latitude/longitude using reverse geocoding
 */
export const getLocationDetails = async (
  lat: number,
  lng: number,
): Promise<{ success?: LocationData; error?: string }> => {
  try {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    
    if (!token) {
        console.error("[geocode] NEXT_PUBLIC_MAPBOX_TOKEN is not set.");
        
        return { error: "Geocoding service is not configured." };
    }
    
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1`;
    
    let mapboxRes: Response;
    
    try {
        mapboxRes = await fetch(url);
    } catch (err) {
        console.error("[geocode] Failed to reach Mapbox API:", err);
        
        return { error: "Failed to reach the geocoding service." };
    }
    
    if (!mapboxRes.ok) {
        console.error("[geocode] Mapbox returned non-OK status:", mapboxRes.status);
        
        return { error: "Geocoding service returned an error." };
    }

    const data = await mapboxRes.json();
    const feature = data?.features?.[0];
    
    if (!feature) {
        return { error: "No address found for the given coordinates." };
    }
    
    const address: string = feature.place_name;

    console.log(`[geocode] Resolved location —`, { lat, lng, address });

    return {
      success: {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
        address: address,
      },
    };
  } catch (error) {
    console.error(`Error fetching location details: ${error}`);

    return { error: `Error fetching location details: ${error}` };
  }
};