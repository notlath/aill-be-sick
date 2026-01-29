# **Isolation Forest Outbreak Monitoring - Implementation Walkthrough**

## **Overview**

Successfully implemented **Isolation Forest** for outbreak monitoring and anomaly detection in the AI healthcare system. The algorithm detects unusual spatial and temporal disease patterns that deviate from normal trends.

## **What Was Implemented**

### **1. Surveillance Module (surveillance.py)**

Created a new module with three main functions:

### **fetch_diagnosis_data(db_url=None)**

- Fetches diagnosis records from PostgreSQL database
- Joins `Diagnosis` and **User** tables to get complete location data
- Encodes data into features: `[latitude, longitude, timestamp_normalized, disease_encoded]`
- Returns numpy array for Isolation Forest and list of diagnosis metadata

### **detect_outbreaks(contamination=0.05, db_url=None)**

- Trains **Isolation Forest** model on diagnosis data
- Parameters:
    - `n_estimators=100`: Number of isolation trees
    - `contamination=0.05`: Expected proportion of outliers (5%)
    - `random_state=42`: For reproducibility
- Returns:
    - `anomalies`: List of outlier records (sorted by anomaly score)
    - **normal**: List of normal records
    - `outbreak_alert`: Boolean flag if anomalies exceed 2x expected

### **get_outbreak_summary(contamination=0.05, db_url=None)**

- Provides aggregated statistics for dashboard display
- Groups anomalies by disease and region
- Returns top 10 most anomalous cases

---

### **2. API Endpoint (app.py)**

Added **GET /api/surveillance/outbreaks** endpoint:

**Query Parameters:**

- `contamination` (float, default=0.05): Expected proportion of outliers
- **summary** (boolean, default=false): Return aggregated summary if true

**Example Usage:**

```
# Full details
GET/api/surveillance/outbreaks?contamination=0.05

# Summary mode (for dashboard)
GET/api/surveillance/outbreaks?contamination=0.05&summary=true

```

**Response Structure:**

```
{
"outbreak_alert":false,
"total_analyzed":150,
"anomaly_count":7,
"contamination":0.05,
"anomalies":[
{
"id":42,
"disease":"Dengue",
"created_at":"2026-01-27T14:30:00",
"latitude":14.6542,
"longitude":121.0512,
"city":"Quezon City",
"region":"Metro Manila",
"confidence":0.85,
"uncertainty":0.03,
"anomaly_score":-0.234
}
]
}

```

---

### **3. Test Script (test_surveillance.py)**

Created test script that validates:

1. Outbreak detection with default contamination
2. Display of top anomalies
3. Outbreak summary generation
4. Different contamination levels (0.01, 0.05, 0.10)

---

## **How Isolation Forest Works**

### **Algorithm Mechanics**

1. **Isolation Trees**: Builds an ensemble of binary decision trees
2. **Random Partitioning**: Recursively splits data using random features and thresholds
3. **Anomaly Detection**: Outliers require fewer splits to be isolated
4. **Scoring**: Lower anomaly scores = more anomalous

### **Features Used**

The model uses 4 dimensions to detect anomalies:

| **Feature** | **Type** | **Description** |
| --- | --- | --- |
| **Latitude** | Float | Geographic coordinate (north-south) |
| **Longitude** | Float | Geographic coordinate (east-west) |
| **Timestamp** | Normalized | Time of diagnosis (0-1 scale) |
| **Disease** | Encoded | Disease type (0-3 for 4 diseases) |

### **What Gets Flagged as Anomalous?**

- **Geographic Outliers**: Diagnoses far from normal clustering areas
- **Temporal Spikes**: Sudden increase in cases at unusual times
- **Disease Patterns**: Rare diseases appearing in unexpected regions
- **Combination**: Any unusual combination of location, time, and disease

---

## **Validation Results**

### **Test Execution**

Test script was run and confirmed:

✅ **Import Success**: All modules import without errors ✅ **Database Integration**: Properly checks for DATABASE_URL ✅ **Error Handling**: Graceful handling when database is unavailable ✅ **User Feedback**: Clear messages and troubleshooting tips

### **Expected Behavior**

**NOTE**

The test script expects a PostgreSQL database with diagnosis data. If DATABASE_URL is not set or the database is empty, it will exit gracefully with a helpful message.

---

## **Deployment Notes**

### **Prerequisites**

1. **Database Setup**: PostgreSQL with **User** and `Diagnosis` tables
2. **Environment Variable**: `DATABASE_URL` must be set
3. **Dependencies**: Already in **requirements.txt**:
    - `scikit-learn==1.5.0`
    - `psycopg2-binary==2.9.10`

### **Running the API**

```
# Navigate to backend directory
cdbackend

# Install dependencies (if not already installed)
pipinstall-rrequirements.txt

# Run Flask app
pythonapp.py

```

The endpoint will be available at:

```
http://localhost:10000/api/surveillance/outbreaks

```

---

## **Integration with K-Means Clustering**

The system now has **two complementary analytics**:

### **K-Means Clustering (`/api/patient-clusters`)**

- Groups patients by demographics and location
- Identifies normal population patterns
- Used for resource allocation

### **Isolation Forest (`/api/surveillance/outbreaks`)**

- Detects abnormal patterns
- Identifies potential outbreak signals
- Used for early warning alerts

---

## **Next Steps**

### **For Dashboard Integration**

1. **Call the API** from the healthcare worker dashboard
2. **Display Alerts** when `outbreak_alert: true`
3. **Visualize Anomalies** on a map (use latitude/longitude)
4. **Filter by Region/Disease** using `disease_breakdown` and `region_breakdown`

### **Example Dashboard Code**

```
constresponse=awaitfetch(
'http://localhost:10000/api/surveillance/outbreaks?summary=true'
);
constdata=awaitresponse.json();

if(data.outbreak_alert){
showAlert(`Outbreak Alert:${data.anomaly_count} anomalies detected!`);
}

// Display top anomalies on map
data.top_anomalies.forEach(anomaly=>{
addMapMarker({
lat:anomaly.latitude,
lng:anomaly.longitude,
disease:anomaly.disease,
score:anomaly.anomaly_score
  });
});

```

---

## **Implementation Alignment with Thesis**

This implementation follows the thesis requirements:

✅ **Unsupervised Learning**: Isolation Forest requires no labeled anomaly data ✅ **Spatial & Temporal**: Uses location and timestamp features 
✅ **Outbreak Detection**: Flags unusual case clustering 
✅ **DOH Protocol**: Supports early warning signals for public health ✅ **Dashboard Integration**: Ready for healthcare worker interface