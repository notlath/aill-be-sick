// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("../lib/generated/prisma");
import * as fs from "fs";
import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";
import * as path from "path";

const prisma = new PrismaClient();

interface GeoJSONFeature {
  type: "Feature";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: any;
  };
  properties?: {
    name?: string;
    adm4_en?: string;
    [key: string]: any;
  };
}

interface GeoJSONCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

interface UserCoordinateUpdate {
  id: number;
  latitude: number;
  longitude: number;
  district: string;
}

// Load and parse GeoJSON
function loadGeoJSON(filePath: string): GeoJSONCollection {
  const data = fs.readFileSync(filePath, "utf-8");
  const geojson = JSON.parse(data);

  if (geojson.type === "FeatureCollection") {
    return geojson;
  } else if (geojson.type === "Feature") {
    return { type: "FeatureCollection", features: [geojson] };
  } else {
    throw new Error("Invalid GeoJSON format");
  }
}

// Get the bounding box of all features
function getBoundingBox(
  features: GeoJSONFeature[],
): [number, number, number, number] {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;

  features.forEach((feature) => {
    const bbox = turf.bbox(feature as Feature);
    minLng = Math.min(minLng, bbox[0]);
    minLat = Math.min(minLat, bbox[1]);
    maxLng = Math.max(maxLng, bbox[2]);
    maxLat = Math.max(maxLat, bbox[3]);
  });

  return [minLng, minLat, maxLng, maxLat];
}

// Generate random point within bounding box
function generateRandomPoint(
  bbox: [number, number, number, number],
): [number, number] {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const lng = Math.random() * (maxLng - minLng) + minLng;
  const lat = Math.random() * (maxLat - minLat) + minLat;
  return [lng, lat];
}

// Find which district a point belongs to
function findDistrictForPoint(
  point: [number, number],
  features: GeoJSONFeature[],
): string | null {
  const pointTurf = turf.point(point);

  // Skip features with geo_level === "Bgy" (barangay-level) as they are too general
  // Look for more specific districts first (Subbgy level)
  for (const feature of features) {
    try {
      if (
        feature.geometry.type === "Polygon" ||
        feature.geometry.type === "MultiPolygon"
      ) {
        // Skip barangay-level features for district assignment
        if (feature.properties?.geo_level === "Bgy") {
          continue;
        }
        
        const result = turf.booleanPointInPolygon(
          pointTurf,
          feature as Feature<Polygon | MultiPolygon>,
        );
        if (result) {
          // Try multiple property names for district
          return (
            feature.properties?.name ??
            feature.properties?.adm4_en ??
            "Unknown District"
          );
        }
      }
    } catch (error) {
      console.error("Error checking point in polygon:", error);
    }
  }

  // If no specific district found, fall back to barangay-level
  for (const feature of features) {
    try {
      if (
        feature.geometry.type === "Polygon" ||
        feature.geometry.type === "MultiPolygon"
      ) {
        if (feature.properties?.geo_level === "Bgy") {
          const result = turf.booleanPointInPolygon(
            pointTurf,
            feature as Feature<Polygon | MultiPolygon>,
          );
          if (result) {
            return (
              feature.properties?.name ??
              feature.properties?.adm4_en ??
              "Unknown District"
            );
          }
        }
      }
    } catch (error) {
      console.error("Error checking point in polygon:", error);
    }
  }

  return null;
}

// Check if point is within any polygon (excluding barangay-level)
function isPointInPolygons(
  point: [number, number],
  features: GeoJSONFeature[],
): boolean {
  return features.some((feature) => {
    try {
      if (
        feature.geometry.type === "Polygon" ||
        feature.geometry.type === "MultiPolygon"
      ) {
        // Skip barangay-level features for point validation
        if (feature.properties?.geo_level === "Bgy") {
          return false;
        }
        const pointTurf = turf.point(point);
        return turf.booleanPointInPolygon(
          pointTurf,
          feature as Feature<Polygon | MultiPolygon>,
        );
      }
      return false;
    } catch (error) {
      console.error("Error checking point in polygon:", error);
      return false;
    }
  });
}

// Generate valid coordinates with district
function generateValidCoordinatesWithDistrict(
  features: GeoJSONFeature[],
  maxAttempts: number = 1000,
): { coords: [number, number]; district: string } | null {
  const bbox = getBoundingBox(features);

  for (let i = 0; i < maxAttempts; i++) {
    const point = generateRandomPoint(bbox);
    if (isPointInPolygons(point, features)) {
      const district = findDistrictForPoint(point, features);
      if (district) {
        return { coords: point, district };
      }
    }
  }

  console.warn(
    `Could not generate valid coordinate after ${maxAttempts} attempts`,
  );
  return null;
}

// Update users with coordinates and districts
async function updateUsersWithCoordinates() {
  try {
    // Load GeoJSON
    const geojsonPath = path.resolve(__dirname, "../public/geojson/bagong_silangan.geojson");
    const geojson = loadGeoJSON(geojsonPath);
    const features = geojson.features;

    console.log(`✅ Loaded ${features.length} districts from GeoJSON`);

    // Log available districts
    console.log("\nAvailable districts:");
    features.forEach((feature, idx) => {
      console.log(`  ${idx + 1}. ${feature.properties?.name || feature.properties?.adm4_en || "Unnamed"}`);
    });

    // Fetch all existing users
    console.log("\n📥 Fetching existing users from database...");
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users to update\n`);

    if (users.length === 0) {
      console.log("⚠️  No users found in database. Nothing to update.");
      return;
    }

    // Prepare updates
    const updates: UserCoordinateUpdate[] = [];
    const districtCounts: { [key: string]: number } = {};
    let successCount = 0;
    let failureCount = 0;

    // Generate coordinates for each user
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const result = generateValidCoordinatesWithDistrict(features);

      if (result) {
        const [lng, lat] = result.coords;
        const { district } = result;

        updates.push({
          id: user.id,
          latitude: lat,
          longitude: lng,
          district,
        });

        districtCounts[district] = (districtCounts[district] || 0) + 1;
        successCount++;
      } else {
        failureCount++;
        console.warn(`⚠️  Failed to generate coordinates for user ${user.id}`);
      }

      if ((i + 1) % 10 === 0) {
        console.log(
          `Generated coordinates for ${i + 1}/${users.length} users...`,
        );
      }
    }

    console.log(
      `\n✅ Successfully generated ${successCount}/${users.length} coordinate sets`,
    );

    if (failureCount > 0) {
      console.log(
        `⚠️  Failed to generate coordinates for ${failureCount} users`,
      );
    }

    // Show distribution
    console.log("\nDistrict distribution:");
    Object.entries(districtCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([district, count]) => {
        const percentage = ((count / successCount) * 100).toFixed(1);
        console.log(`  ${district}: ${count} users (${percentage}%)`);
      });

    // Perform updates
    console.log(`\n📝 Updating ${updates.length} users in database...`);
    let updateCount = 0;

    for (const update of updates) {
      await prisma.user.update({
        where: { id: update.id },
        data: {
          latitude: update.latitude,
          longitude: update.longitude,
          district: update.district,
        },
      });
      updateCount++;

      if (updateCount % 10 === 0) {
        console.log(`Updated ${updateCount}/${updates.length} users...`);
      }
    }

    console.log(
      `\n✅ Successfully updated ${updateCount} users with coordinates and districts`,
    );

    // Show summary
    console.log("\n📊 Update Summary:");
    console.log(`  Total users updated: ${updateCount}`);
    console.log(`  Total users skipped: ${users.length - updateCount}`);
    console.log(
      `  Update rate: ${((updateCount / users.length) * 100).toFixed(1)}%`,
    );
  } catch (error) {
    console.error("❌ Update error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateUsersWithCoordinates();
