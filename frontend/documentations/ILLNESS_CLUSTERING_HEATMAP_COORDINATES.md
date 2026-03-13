# Illness Clustering Heatmap Coordinate View

## Overview
- **Purpose**: To provide a geographic heat map overlay of illness clusters based on exact patient coordinates, allowing clinicians to visualize the dense pockets and spatial distribution of diagnoses at a micro-level (street/coordinate level) across Brgy. Bagong Silangan.
- **Target Users**: Epidemiologists, clinicians, and healthcare administrators needing highly specific location mapping of clustered illnesses rather than generalized district averages.
- **Key Benefits**: 
  - **Precision Tracking**: Displays actual recorded latitudes and longitudes from patient diagnoses.
  - **Dynamic Interactivity**: Users can toggle between District (Choropleth) and Coordinates (Heatmap) views seamlessly.
  - **Density Insight**: Visually highlights high-risk areas using a gradient density blur based on proximity of occurrences within a specific group.

## How It Works
- **Core Functionality**: The implementation leverages the `react-leaflet` library combined with `leaflet.heat` to render an interactive map layer. It filters for illnesses that have valid geographical coordinates and computes a density matrix overlaid onto the OpenStreetMap tiles.
- **User Flow**: 
  1. Clinician navigates to the 'By Cluster' tab.
  2. The clinician selects "Coordinates" via the `ViewSelect` toggle control.
  3. The `by-cluster-tab.tsx` parent component updates its internal `view` state context.
  4. The `HeatmapMap` component dynamically imports and mounts via Next.js.
  5. Plotted coordinate points matching the currently selected cluster group are piped into the underlying `leaflet.heatLayer`, rendering the hot zones.
- **System Integration**: 
  - Subscribes to the overarching `useIllnessClusterData` hook which provides the K-Means clustered patient groups.
  - Communicates directly with the `ViewSelect` state lifting map parameters upstream.
  - The map component ensures isolation of the `Leaflet` APIs exclusively to the client-side context to comply with Next.js SSR constraints.

## Implementation
- **Technical Requirements**: 
  - Next.js Dynamic Imports (`ssr: false`) to avoid server-side document errors.
  - `react-leaflet` for declarative map mounting.
  - `leaflet` and `leaflet.heat` plugin dependencies.
- **Configuration**: 
  - Fixed map view constraints targeting `Brgy. Bagong Silangan`: Center `[14.71, 121.113]`, Base Zoom `14`.
  - Heatmap gradient attributes configured to `radius: 25`, `blur: 15`, `maxZoom: 17`.
- **Code Examples**:

```tsx
// 1. Leaflet Layer Hook Integration Strategy (heatmap-layer.tsx)
useEffect(() => {
  const L = require("leaflet");
  require("leaflet.heat");

  const points = diagnoses
    .filter((d) => d.latitude != null && d.longitude != null)
    .map((d) => [d.latitude!, d.longitude!, 1.0] as [number, number, number]);

  // Initializing the heat layer on the leaflet map instance
  const heat = (L as any)
    .heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
    })
    .addTo(map);

  // Fallback cleanup to prevent memory leaks on remounts
  return () => {
    map.removeLayer(heat);
  };
}, [map, diagnoses]);

// 2. View Selection in the main Tab (by-cluster-tab.tsx)
{view === "district" ? (
  <ClusterChoroplethMap
    geoData={geoData}
    casesData={casesData}
    illnesses={filteredIllnesses}
    legendBins={legendBins}
  />
) : (
  <HeatmapMap diagnoses={filteredIllnesses as any} />
)}
```

## Reference
- **Parameters**: 
  - `diagnoses: GeoPoint[]`: Array containing mapped patient records needing at least a `latitude: number` and `longitude: number`.
- **Error Handling**: 
  - Patient records with `null` or undefined locations are silently discarded via a `.filter()` function prior to mapping coordinates on Leaflet.
  - Unique map re-mounting behavior handled with a combined `useId()` and incrementing `useRef` key logic to prevent stale layer crashes on hot reload or state updates.
- **Performance**: 
  - Extracts the Leaflet imports directly into the `useEffect` scope (`require("leaflet")`) guaranteeing lightweight loading over the document server.
  - Limits plotting calculations to only records that belong to the active cluster by pre-filtering upstream across a `useMemo` instance.
