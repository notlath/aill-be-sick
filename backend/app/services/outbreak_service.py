# outbreak_service.py
# Outbreak Detection Service using DOH PIDSR Statistical Thresholds and K-Means Clustering
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import text
from sklearn.metrics import calinski_harabasz_score
from sklearn.cluster import KMeans
from app.utils.database import get_db_engine
from app.services.illness_cluster_service import fetch_diagnosis_data, run_illness_kmeans

# Reason Codes for Outbreaks (DOH PIDSR Methodology)
REASON_OUTBREAK_EPIDEMIC = "OUTBREAK:EPIDEMIC_THRESHOLD"  # Mean + 2σ (PIDSR Epidemic)
REASON_OUTBREAK_ALERT = "OUTBREAK:ALERT_THRESHOLD"  # Mean + 1σ (PIDSR Alert)
REASON_CLUSTER_DENSE = "CLUSTER:DENSE"
REASON_VOL_SPIKE = "OUTBREAK:VOL_SPIKE"

def calculate_statistical_thresholds(diagnoses, days=30):
    """
    Calculate disease-specific thresholds per district based on historical data.
    Uses DOH PIDSR methodology: Alert = mean + 1σ, Epidemic = mean + 2σ
    Returns a dictionary mapping (disease, district) -> (mean, std_dev, alert_threshold, epidemic_threshold)
    """
    # Group by disease, district, and day
    counts = {}
    for d in diagnoses:
        district = d.get('district') or "UNKNOWN"
        key = (d['disease'], district)
        date = d['diagnosed_at'][:10] # YYYY-MM-DD
        if key not in counts:
            counts[key] = {}
        counts[key][date] = counts[key].get(date, 0) + 1
    
    thresholds = {}
    for key, date_counts in counts.items():
        daily_volumes = list(date_counts.values())
        # Pad with zeros for days with no cases to get a realistic mean/std
        if len(daily_volumes) < days:
            daily_volumes.extend([0] * (days - len(daily_volumes)))
            
        v_mean = np.mean(daily_volumes)
        v_std = np.std(daily_volumes)
        
        thresholds[key] = {
            "mean": float(v_mean),
            "std": float(v_std),
            "alert": float(v_mean + 1 * v_std),  # DOH PIDSR Alert Threshold
            "epidemic": float(v_mean + 2 * v_std)  # DOH PIDSR Epidemic Threshold
        }
    return thresholds

def find_optimal_clusters(data):
    """
    Use Calinski-Harabasz Index to find the optimal number of clusters (2-10).
    """
    if len(data) < 3:
        return 1
    
    unique_count = len(np.unique(data, axis=0))
    if unique_count < 2:
        return 1
        
    max_k = min(10, len(data) - 1, unique_count)
    if max_k < 2:
        return 1
        
    best_k = 2
    best_score = -1
    
    import warnings
    from sklearn.exceptions import ConvergenceWarning

    for k in range(2, max_k + 1):
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=ConvergenceWarning)
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            labels = kmeans.fit_predict(data)
            
        if len(set(labels)) > 1:
            score = calinski_harabasz_score(data, labels)
            if score > best_score:
                best_score = score
                best_k = k
            
    return best_k

def detect_outbreaks(db_url=None):
    """
    Main entry point for outbreak detection.
    Analyzes recent diagnoses (last 7 days) against 30-day historical baselines.
    """
    # 1. Fetch historical data (last 37 days to have 30 days of baseline + 7 days of analysis)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=37)
    
    encoded_data, illness_info = fetch_diagnosis_data(
        db_url=db_url,
        start_date=start_date.strftime("%Y-%m-%d"),
        end_date=end_date.strftime("%Y-%m-%d")
    )
    
    if len(illness_info) < 5:
        return []

    # 2. Split into baseline (last 37 to 8 days) and analysis (last 7 days)
    analysis_cutoff = end_date - timedelta(days=7)
    baseline_diagnoses = [d for d in illness_info if datetime.fromisoformat(d['diagnosed_at']) < analysis_cutoff]
    recent_diagnoses = [d for d in illness_info if datetime.fromisoformat(d['diagnosed_at']) >= analysis_cutoff]
    
    if not recent_diagnoses:
        return []

    # 3. Calculate thresholds from baseline
    thresholds = calculate_statistical_thresholds(baseline_diagnoses, days=30)
    
    # 4. Analyze recent volumes by disease and district
    recent_counts = {}
    for d in recent_diagnoses:
        district = d.get('district') or "UNKNOWN"
        key = (d['disease'], district)
        recent_counts[key] = recent_counts.get(key, 0) + 1
        
    outbreaks = []
    
    # Threshold-based detection
    for key, count in recent_counts.items():
        disease, district = key
        stats = thresholds.get(key)
        
        # Minimum volume of 3 cases in 7 days to trigger an outbreak alert
        if count < 3:
            continue
            
        reasons = []
        severity = "LOW"
        
        if stats:
            # Check for epidemic threshold (Mean + 2σ per DOH PIDSR)
            if count >= stats['epidemic']:
                reasons.append(REASON_OUTBREAK_EPIDEMIC)
                severity = "CRITICAL"
            # Check for alert threshold (Mean + 1σ per DOH PIDSR)
            elif count >= stats['alert']:
                reasons.append(REASON_OUTBREAK_ALERT)
                severity = "HIGH"
        else:
            # No baseline data - if we see a sudden cluster, mark as alert
            if count >= 5:
                reasons.append(REASON_VOL_SPIKE)
                severity = "MEDIUM"
                
        if reasons:
            outbreaks.append({
                "type": "OUTBREAK",
                "severity": severity,
                "disease": disease,
                "district": district,
                "reasonCodes": reasons,
                "message": f"Potential {disease} outbreak detected in {district}. Volume ({count} cases) exceeded DOH PIDSR thresholds.",
                "metadata": {
                    "disease": disease,
                    "district": district,
                    "count": count,
                    "baseline_mean": stats['mean'] if stats else 0,
                    "threshold_alert": stats['alert'] if stats else 0,
                    "threshold_epidemic": stats['epidemic'] if stats else 0
                }
            })

    # 5. Cluster-based detection (K-Means)
    # Filter encoded data to only include recent diagnoses for cluster density check
    recent_indices = [i for i, d in enumerate(illness_info) if datetime.fromisoformat(d['diagnosed_at']) >= analysis_cutoff]
    if len(recent_indices) >= 5:
        recent_encoded = encoded_data[recent_indices]
        recent_info = [illness_info[i] for i in recent_indices]
        
        optimal_k = find_optimal_clusters(recent_encoded)
        clusters, _ = run_illness_kmeans(recent_encoded, n_clusters=optimal_k)
        
        for cluster_id in range(optimal_k):
            cluster_items = [recent_info[i] for i, cid in enumerate(clusters) if cid == cluster_id]
            if len(cluster_items) >= 5:
                # Dense cluster detected
                # Check if this cluster's disease/district already has a threshold alert
                diseases = [d['disease'] for d in cluster_items]
                most_common_disease = max(set(diseases), key=diseases.count)
                districts = [d.get('district') or "UNKNOWN" for d in cluster_items]
                most_common_district = max(set(districts), key=districts.count)
                
                # Check if we already have an alert for this disease/district
                existing = [o for o in outbreaks if o['disease'] == most_common_disease and o['district'] == most_common_district]
                
                if existing:
                    # Add CLUSTER:DENSE to existing alert
                    if REASON_CLUSTER_DENSE not in existing[0]['reasonCodes']:
                        existing[0]['reasonCodes'].append(REASON_CLUSTER_DENSE)
                else:
                    outbreaks.append({
                        "type": "OUTBREAK",
                        "severity": "MEDIUM",
                        "disease": most_common_disease,
                        "district": most_common_district,
                        "reasonCodes": [REASON_CLUSTER_DENSE],
                        "message": f"Dense cluster of {most_common_disease} cases detected in {most_common_district}.",
                        "metadata": {
                            "disease": most_common_disease,
                            "district": most_common_district,
                            "count": len(cluster_items),
                            "is_cluster": True
                        }
                    })

    return outbreaks
