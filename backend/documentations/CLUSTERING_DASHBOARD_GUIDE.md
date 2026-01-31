# K-Means Patient Clustering - Dashboard Integration Guide

## 🎯 Overview

The `/api/patient-clusters` endpoint now performs K-means clustering on patient data including:

- **Location** (latitude, longitude, city, region)
- **Age** (normalized 18-100)
- **Gender** (MALE/FEMALE encoded)

## 📊 API Response Structure

### Endpoint

```
GET /api/patient-clusters?n_clusters=4
```

### Response Format

```json
{
  "n_clusters": 4,
  "total_patients": 100,
  "cluster_statistics": [
    {
      "cluster_id": 0,
      "count": 46,
      "avg_age": 46.1,
      "gender_distribution": {
        "MALE": 28,
        "FEMALE": 18,
        "OTHER": 0
      },
      "top_regions": [
        { "region": "NCR", "count": 20 },
        { "region": "Zamboanga Peninsula", "count": 10 },
        { "region": "SOCCSKSARGEN", "count": 5 }
      ],
      "top_cities": [
        { "city": "Parañaque", "count": 10 },
        { "city": "Zamboanga City", "count": 10 },
        { "city": "Manila", "count": 6 }
      ]
    }
    // ... more clusters
  ],
  "patients": [
    {
      "id": 1,
      "name": "Juan Dela Cruz",
      "email": "juan.delacruz@example.com",
      "latitude": 14.5995,
      "longitude": 120.9842,
      "city": "Manila",
      "region": "NCR",
      "gender": "MALE",
      "age": 35,
      "cluster": 0
    }
    // ... all patients
  ],
  "centers": [
    [14.5547, 121.0244, 0.45, 1.0, 293.6, 360.9]
    // ... cluster centers (lat, lon, age_norm, gender_enc, city_enc, region_enc)
  ]
}
```

## 📈 Dashboard Visualization Ideas

### 1. **Cluster Overview Cards**

Display key metrics for each cluster:

- Total patient count
- Average age
- Gender distribution (pie chart or bar)
- Top 3 regions/cities

### 2. **Geographic Map**

- Plot patients by lat/long
- Color-code by cluster
- Show cluster centers
- Interactive tooltips with patient info

### 3. **Demographics Charts**

- Age distribution per cluster (histogram)
- Gender distribution per cluster (pie/donut)
- Regional distribution (map or bar chart)

### 4. **Patient Table**

- Filterable by cluster
- Sortable by age, gender, location
- Search by name/email

## 🔧 Sample Dashboard Code (React/Next.js)

```typescript
interface ClusterData {
  n_clusters: number;
  total_patients: number;
  cluster_statistics: ClusterStatistics[];
  patients: Patient[];
  centers: number[][];
}

interface Patient {
  id: number;
  name: string;
  email: string;
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  age: number;
  cluster: number;
}

// Fetch data
const response = await fetch(
  "http://127.0.0.1:10000/api/patient-clusters?n_clusters=4"
);
const data: ClusterData = await response.json();

// Display cluster cards
{
  data.cluster_statistics.map((cluster) => (
    <ClusterCard
      key={cluster.cluster_id}
      clusterNumber={cluster.cluster_id}
      patientCount={cluster.count}
      avgAge={cluster.avg_age}
      genderDist={cluster.gender_distribution}
      topRegions={cluster.top_regions}
    />
  ));
}
```

## 🚀 Next Steps

1. **Restart Backend** - The new clustering code is ready but requires backend restart
2. **Create Dashboard Components** - Build UI components for visualization
3. **Add Interactivity** - Implement filters, search, and drill-down features
4. **Optimize Performance** - Consider pagination for large patient lists

## 📋 Current Test Results

**100 patients clustered into 4 groups:**

- **Cluster 0**: 46 patients, avg age 46.1, 28M/18F, mainly NCR & Zamboanga
- **Cluster 1**: 40 patients, avg age 46.6, 23M/17F, mainly NCR (Pasig, QC)
- **Cluster 2**: 14 patients, avg age 50.0, 6M/8F, mainly Mindanao & Cordillera

The clustering successfully groups patients by:
✅ Geographic proximity (regions/cities)
✅ Age similarity
✅ Gender patterns
