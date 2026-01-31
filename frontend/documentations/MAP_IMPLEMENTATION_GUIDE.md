# Philippines Map Implementation Guide

## Overview
This document details the implementation of the interactive, hierarchical Choropleth Map of the Philippines. The map allows users to visualize disease trends at different administrative levels, from the national view down to individual barangays.

## Key Features
-   **Hierarchical Drill-down**:
    -   **Level 1**: Country View (Composite of all Provinces).
    -   **Level 2**: Province View (Composite of all Barangays in that province).
-   **Smart Data Fetching**:
    -   Uses a custom hook `useGeoData` to manage complex fetching logic.
    -   Implements **Caching** to prevent redundant network requests.
    -   Implements **Concurrency Limiting** to handle massive parallel file downloads (50+ barangay files) without freezing the browser.
-   **Visual Overlays**:
    -   Displays **City/Municipality Boundaries** on top of the Barangay view to provide context.
-   **Performance Optimized**:
    -   Memoized components and optimized D3 rendering cycles.

---

## Architecture

### 1. Data Structure (TopoJSON)
The map relies on a specific folder structure for TopoJSON files in `public/topojson`:

```text
public/topojson/
├── country/
│   └── country.topo.0.01.json        # National level data (Regions)
├── region/
│   └── provdists-region-{id}.topo.0.1.json  # Provinces within a Region
├── provdists/
│   └── municities-provdist-{id}.topo.0.1.json # Municipalities within a Province
└── municities/
    └── bgysubmuns-municity-{id}.0.1.json    # Barangays within a Municipality
```

### 2. Component Architecture
We split the logic into two main parts:
1.  **`useGeoData` Hook**: Handles data fetching, caching, and state.
2.  **`PhilippinesMap` Component**: Handles rendering (D3.js) and user interaction.

---

## Implementation Details

### The Data Hook (`hooks/use-geo-data.ts`)
This hook is the brain of the operation. It manages:
-   **State**: `geoData` (features to render), `loading`, `error`.
-   **Concurrency**: Uses a semaphore pattern to limit active `fetch` requests to 5 at a time.
-   **Caching**: A module-level `Map` stores fetched TopoJSON objects, so navigating back to a previously visited province is instant.

**Key Logic: Parallel Fetching with Limits**
When loading a Province, we need to fetch all its constituent Barangays (one file per municipality).
```typescript
// Example of how we limit concurrency
const limit = pLimit(5); // Limit to 5 parallel requests

const barangayPromises = municityIds.map((id) =>
  limit(async () => {
    // Fetch individual barangay file...
  })
);
```

### The Map Component (`components/visualization/philippines-map.tsx`)
This component uses **D3.js** for rendering the SVG map.

#### Rendering Strategy
We use `React.memo` to prevent re-renders unless the view changes. Inside `useEffect`, we manipulate the DOM directly with D3 for maximum performance.

#### Layers
We draw two distinct layers to visualize hierarchy:
1.  **`layer-features`**: The base layer.
    -   In Country View: Shows Provinces.
    -   In Province View: Shows **Barangays** (filled shapes).
2.  **`layer-boundaries`**: The overlay layer.
    -   In Province View: Draws thick borders around **Cities/Municipalities**.
    -   This helps users distinguish which City a group of Barangays belongs to.

```typescript
// D3 rendering of the overlay
const boundaryLayer = g.append("g").attr("class", "layer-boundaries");

boundaryLayer.selectAll("path")
    .data(geoData.boundaries) // Municipality shapes
    .join("path")
    .attr("fill", "none")     // Transparent fill
    .attr("stroke", "#444")   // Dark border
    .attr("stroke-width", 0.5);
```

#### Zoom & Pan
We use `d3.zoom` implementation.
-   **Semantic Zoom**: We adjust `stroke-width` dynamically when zooming.
-   As you zoom in, lines get thinner relative to the screen to avoid "thick marker" look.
```typescript
.on("zoom", (event) => {
    g.attr("transform", event.transform);
    // Scale stroke width by 1/k (inverse of zoom scale)
    g.selectAll("path").attr("stroke-width", baseStroke / event.transform.k);
});
```

---

## How to Extend This

### Adding Data Visualization (Choropleth)
To color the map based on data (e.g., "Dengue Cases"):
1.  Fetch your statistical data in `PhilippinesMap` or pass it as props.
2.  Create a `d3.scaleSequential` or `d3.scaleThreshold`.
3.  Update the `fill` attribute logic:
```typescript
.attr("fill", (d) => {
    const provinceId = d.properties.adm2_psgc;
    const value = dataMap[provinceId] || 0;
    return colorScale(value);
})
```

### Changing Drill-down Behavior
Currently, we skip the "City" view and go straight to "Barangays".
If you want to show a City View (just the city, no barangays yet):
1.  Update `getNextLevel` in `PhilippinesMap.tsx`:
    ```typescript
    if (current === "province") return "municity";
    ```
2.  Update `useGeoData` to handle the `municity` level (fetching just that city's barangays).

## Troubleshooting

### "File Not Found" (404)
-   The system tries multiple file extensions (`.topo.0.1.json`, `.0.1.json`, etc.) automatically.
-   If you see 404s, check `public/topojson` to ensure the file exists and follows the naming convention `municities-provdist-{PSGC_ID}`.

### Performance Issues
-   If the map stutters, check the Console. If you see hundreds of fetch requests starting at once, the Concurrency Limiter might be configured too high.
-   Adjust `pLimit(5)` in `use-geo-data.ts` to a lower number if needed.
