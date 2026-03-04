# Illness Clustering Migration Guide

## Overview

This document describes the migration from **Patient Clustering** to **Illness Clustering** as the sole clustering mechanism in the AI'll Be Sick application. This change consolidates the clustering functionality around a more clinically relevant approach.

---

## Background

### Original Architecture

The application previously offered two distinct clustering features:

1. **Patient Clustering** - Grouped patients based on demographics and disease history
   - Variables: age, gender, disease, city, region
   - Purpose: "Which patients are similar?"
   - Endpoint: `/api/patient-clusters`

2. **Illness Clustering** - Grouped diagnoses/illnesses by disease patterns and contextual factors
   - Variables: age, gender, city, region, time (seasonal)
   - Purpose: "Which diagnoses/illnesses are similar?"
   - Endpoint: `/api/illness-clusters`

### Problem Statement

Having two clustering systems created:
- **Code duplication** - Similar clustering logic maintained in two places
- **User confusion** - Clinicians had to choose between similar-looking features
- **Conceptual overlap** - Both systems answered related but not clearly differentiated questions
- **Maintenance burden** - Changes needed to be applied to both systems

---

## Design Decision: Why Illness Clustering?

After analysis, we chose to keep **Illness Clustering** and remove Patient Clustering for the following reasons:

### 1. Clinical Relevance

**Illness clustering** directly answers the question clinicians ask: *"What are the patterns of different diseases across demographics, geography, and time?"*

**Patient clustering** answers: *"Which patients have similar characteristics?"* - which is less actionable for public health surveillance.

### 2. Disease as the Primary Feature

In illness clustering, **disease type is the fundamental characteristic** of an illness. Without disease, you're not clustering illnesses—you're clustering patient demographics.

**Key Decision**: Disease is **always included** in illness clustering and cannot be toggled off.

**Rationale**:
- Disease type is what makes an illness an illness
- Other variables (age, gender, city, time) are **contextual modifiers** that help understand disease patterns
- Removing disease would answer a question already addressed by patient clustering
- The backend implementation (`illness_cluster_service.py`) already always includes disease, indicating this was the original design intent

### 3. Exploratory Power

Illness clustering with optional variables enables clinicians to discover:
- **Seasonal patterns** - Flu peaks in winter, allergies in spring, dengue in rainy season
- **Geographic hotspots** - Which regions/cities have concentrated disease outbreaks
- **Demographic vulnerabilities** - Age groups and genders most affected by specific diseases
- **Disease co-occurrence** - When enabled, how diseases cluster together

### 4. Alignment with Use Cases

The primary use case is **disease surveillance and outbreak detection**, not patient segmentation. Illness clustering directly supports this by grouping diagnoses rather than patients.

---

## Changes Made

### Frontend Components Removed

| Component | Purpose | Reason for Removal |
|-----------|---------|-------------------|
| `patient-clusters.tsx` | Main patient clusters component | Feature removed |
| `patient-clusters-client.tsx` | Client-side clustering logic | Feature removed |
| `cluster-overview-cards.tsx` | Patient cluster statistics cards | Replaced by illness-cluster-overview-cards |
| `demographics-charts.tsx` | Patient demographic visualization | Not needed for illness clustering |
| `diseases-charts.tsx` | Disease distribution charts | Integrated into illness overview |
| `geographic-distribution.tsx` | Geographic visualization | Replaced by map integration |
| `cluster-details-table.tsx` | Detailed cluster data table | Not needed for illness clustering |

### Frontend Components Retained

| Component | Purpose | Status |
|-----------|---------|--------|
| `illness-clusters.tsx` | Main illness clusters component | Active |
| `illness-clusters-client.tsx` | Client-side illness clustering logic | Active |
| `illness-cluster-overview-cards.tsx` | Illness cluster statistics cards | Active |

### UI Changes

#### Dashboard Page (`/dashboard`)
- **Before**: Two sections - "Patient Clusters" and "Illness Patterns"
- **After**: Single section - "Illness Patterns"

#### Map Page (`/map`)
- **Before**: Four tabs - "By disease", "By patient cluster", "By illness pattern", "By anomaly"
- **After**: Three tabs - "By disease", "By illness pattern", "By anomaly"

### Variable Selection in Illness Clustering

The illness clustering interface offers these variable toggles:

| Variable | Default | Description | Can be disabled? |
|----------|---------|-------------|------------------|
| **Patient age** | ✅ On | Include patient age in clustering | Yes |
| **Patient gender** | ✅ On | Include patient gender in clustering | Yes |
| **City** | ✅ On | Include city/location in clustering | Yes |
| **Region** | ❌ Off | Include broader region in clustering | Yes |
| **Time (seasonal)** | ❌ Off | Include diagnosis month for seasonal patterns | Yes |
| **Diagnosed disease** | ✅ **Always On** | Disease type one-hot encoding | **No** |

**Note**: The "Diagnosed disease" variable is not shown in the UI as a toggle because it's always included in the clustering algorithm.

---

## Technical Implementation

### Backend: Disease Feature Encoding

In `backend/app/services/illness_cluster_service.py`:

```python
# Disease is ALWAYS included - no conditional flag
disease_values = sorted({(row[1] or "UNKNOWN") for row in data})
disease_one_hot = [1 if disease == d else 0 for d in disease_values]
features.extend(disease_one_hot)  # Always added
```

### Frontend: API Calls

All clustering API calls now use the illness clustering endpoint:

```typescript
// utils/cluster.ts
export const getIllnessClusters = async (k: number) => {
  const url = `${BACKEND_URL}/api/illness-clusters?n_clusters=${k}`;
  // ... fetch logic
}
```

### Variable Selection Parameters

When calling the clustering API, the following parameters are sent:

```typescript
const params = new URLSearchParams({
  n_clusters: String(clusterCount),
  age: String(selectedVariables.age),      // true/false
  gender: String(selectedVariables.gender), // true/false
  city: String(selectedVariables.city),     // true/false
  region: String(selectedVariables.region), // true/false
  time: String(selectedVariables.time),     // true/false
  // disease: NOT SENT - always included on backend
});
```

---

## Migration Notes

### For Developers

1. **Backend endpoints remain available**: The `/api/patient-clusters` endpoints still exist in the backend code but are no longer called by the frontend.

2. **Type changes**: `PatientClusterData` type is no longer used. All clustering code should use `IllnessClusterData`.

3. **Utility functions**: `getPatientClusters()` has been removed from `utils/cluster.ts`. Use `getIllnessClusters()` instead.

4. **Map integration**: The map page now only supports illness cluster heatmaps. Patient cluster heatmap logic has been removed from `map-container.tsx`.

### For Users

1. **Dashboard**: The "Patient Clusters" section has been removed. Only "Illness Patterns" is displayed.

2. **Map view**: The "By patient cluster" tab has been removed. Use "By illness pattern" for cluster visualization.

3. **Clustering behavior**: Illness clustering now provides more focused insights on disease patterns rather than patient similarity.

---

## Future Considerations

### Re-enabling Patient Clustering

If patient clustering needs to be re-enabled in the future:

1. Restore the deleted component files from version control
2. Re-add the `getPatientClusters` function to `utils/cluster.ts`
3. Re-add the "By patient cluster" tab to `map-tabs.tsx`
4. Restore patient cluster state and logic in `map-container.tsx`
5. Re-add the PatientClusters section to `dashboard/page.tsx`

### Potential Enhancements to Illness Clustering

1. **Time-series analysis**: Add trend detection for seasonal patterns
2. **Multi-disease clustering**: Better visualization when multiple diseases co-occur
3. **Risk factor integration**: Include additional patient risk factors in clustering
4. **Export functionality**: Allow clinicians to export cluster reports

---

## Testing Recommendations

When testing illness clustering:

1. **Variable toggles**: Verify each variable (age, gender, city, region, time) correctly affects clustering when enabled/disabled
2. **Recommended K**: Confirm silhouette analysis provides appropriate cluster count recommendations
3. **Seasonal patterns**: When "Time (seasonal)" is enabled, verify month-based clustering works correctly
4. **Geographic accuracy**: Ensure city and region data correctly maps to heatmap visualizations
5. **Performance**: Monitor clustering performance with large datasets (1000+ diagnoses)

---

## References

- **Backend Service**: `backend/app/services/illness_cluster_service.py`
- **API Endpoint**: `backend/app/api/cluster.py` (lines 175-238)
- **Frontend Component**: `frontend/components/clinicians/dashboard-page/illness-clusters.tsx`
- **Client Logic**: `frontend/components/clinicians/dashboard-page/clustering/illness-clusters-client.tsx`
- **Overview Cards**: `frontend/components/clinicians/dashboard-page/clustering/illness-cluster-overview-cards.tsx`

---

## Document History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-03-04 | 1.0 | Development Team | Initial migration documentation |
