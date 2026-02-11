"""
Easy-to-read display for Isolation Forest outbreak detection results
"""

import requests
import json
from datetime import datetime


def display_results(
    url="http://localhost:10000/api/surveillance/outbreaks?summary=true",
):
    """Fetch and display outbreak detection results in a readable format"""

    try:
        response = requests.get(url)
        data = response.json()
    except Exception as e:
        print(f"❌ Error fetching data: {e}")
        return

    # Header
    print("\n" + "=" * 70)
    print("🚨 ISOLATION FOREST - DISEASE OUTBREAK DETECTION REPORT 🚨")
    print("=" * 70 + "\n")

    # Overall Statistics
    print("📊 OVERALL STATISTICS")
    print("-" * 70)
    print(f"  Total Cases Analyzed:        {data.get('total_analyzed', 0)}")
    print(f"  Anomalies Detected:          {data.get('anomaly_count', 0)}")
    print(
        f"  Contamination Threshold:     {data.get('contamination', 0.05) * 100:.1f}%"
    )
    print(
        f"  Outbreak Alert:              {'⚠️  YES - ALERT!' if data.get('outbreak_alert') else '✅ NO - Normal'}"
    )
    print()

    # Disease Breakdown
    print("🦠 ANOMALIES BY DISEASE")
    print("-" * 70)
    disease_breakdown = data.get("disease_breakdown", {})
    if disease_breakdown:
        for disease, count in sorted(
            disease_breakdown.items(), key=lambda x: x[1], reverse=True
        ):
            bar = "█" * count
            print(f"  {disease:15} {bar} ({count} cases)")
    else:
        print("  No anomalies detected")
    print()

    # Region Breakdown
    print("🗺️  ANOMALIES BY REGION")
    print("-" * 70)
    region_breakdown = data.get("region_breakdown", {})
    if region_breakdown:
        for region, count in sorted(
            region_breakdown.items(), key=lambda x: x[1], reverse=True
        ):
            bar = "█" * count
            print(f"  {region:20} {bar} ({count} cases)")
    else:
        print("  No regional anomalies")
    print()

    # Top Anomalies Detail
    print("⚠️  TOP ANOMALOUS CASES (Most Unusual)")
    print("-" * 70)
    top_anomalies = data.get("top_anomalies", [])

    if top_anomalies:
        for i, anomaly in enumerate(top_anomalies, 1):
            print(f"\n  Case #{i}")
            print(f"  {'─' * 66}")
            print(f"    Disease:          {anomaly.get('disease', 'Unknown')}")
            print(f"    Patient:          {anomaly.get('user_name', 'Unknown')}")
            print(
                f"    Location:         {anomaly.get('city', 'Unknown')}, {anomaly.get('region', 'Unknown')}"
            )
            print(
                f"    Coordinates:      ({anomaly.get('latitude', 0):.4f}°, {anomaly.get('longitude', 0):.4f}°)"
            )
            print(f"    Date Reported:    {anomaly.get('created_at', 'Unknown')}")

            # Confidence & Uncertainty
            confidence = anomaly.get("confidence", 0) * 100
            uncertainty = anomaly.get("uncertainty", 0)

            conf_bar = "█" * int(confidence / 10)
            print(f"    Confidence:       {conf_bar} {confidence:.1f}%")

            if uncertainty < 0.05:
                unc_badge = "🟢 Very Low"
            elif uncertainty < 0.10:
                unc_badge = "🟡 Low"
            elif uncertainty < 0.15:
                unc_badge = "🟠 Medium"
            else:
                unc_badge = "🔴 High"
            print(f"    Uncertainty:      {unc_badge} ({uncertainty:.4f})")

            # Anomaly Score (how unusual)
            score = anomaly.get("anomaly_score", 0)
            if score < -0.10:
                unusual = "🔴 VERY UNUSUAL"
            elif score < -0.05:
                unusual = "🟠 UNUSUAL"
            elif score < -0.01:
                unusual = "🟡 SLIGHTLY UNUSUAL"
            else:
                unusual = "🟢 NORMAL"
            print(f"    Anomaly Score:    {unusual} ({score:.6f})")
    else:
        print("  No anomalies found")

    print("\n" + "=" * 70)
    print("💡 HOW TO READ THIS:")
    print(
        "  • Anomaly Score: Negative = unusual pattern. Closer to -1 = more anomalous"
    )
    print("  • Confidence: How sure the model is about the diagnosis (higher = better)")
    print("  • Uncertainty: Model doubt/variability (lower = more reliable)")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    display_results()
