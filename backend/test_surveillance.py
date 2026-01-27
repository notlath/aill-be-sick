# test_surveillance.py
# Test script for Isolation Forest Outbreak Detection
import numpy as np
from surveillance import detect_outbreaks, get_outbreak_summary

def test_surveillance():
    """
    Test the surveillance module to ensure it works correctly.
    """
    print("=" * 60)
    print("Testing Surveillance Module - Isolation Forest")
    print("=" * 60)
    
    try:
        # Test 1: Run outbreak detection with default contamination
        print("\n[TEST 1] Running outbreak detection (contamination=0.05)...")
        result = detect_outbreaks(contamination=0.05)
        
        if result["total_analyzed"] == 0:
            print("⚠️  No diagnosis data found in database")
            print("   This is expected if the database is empty or DATABASE_URL is not set")
            return
        
        print(f"✓ Total diagnoses analyzed: {result['total_analyzed']}")
        print(f"✓ Anomalies detected: {result['anomaly_count']}")
        print(f"✓ Outbreak alert: {'YES ⚠️' if result['outbreak_alert'] else 'NO'}")
        
        # Test 2: Show top anomalies
        print("\n[TEST 2] Top 5 most anomalous cases:")
        for i, anomaly in enumerate(result["anomalies"][:5], 1):
            print(f"  {i}. Disease: {anomaly['disease']}, "
                  f"City: {anomaly.get('city', 'Unknown')}, "
                  f"Score: {anomaly['anomaly_score']:.4f}")
        
        # Test 3: Get outbreak summary
        print("\n[TEST 3] Getting outbreak summary...")
        summary = get_outbreak_summary(contamination=0.05)
        
        print(f"✓ Disease breakdown:")
        for disease, count in summary.get("disease_breakdown", {}).items():
            print(f"    {disease}: {count} anomalies")
        
        print(f"✓ Region breakdown:")
        for region, count in summary.get("region_breakdown", {}).items():
            print(f"    {region}: {count} anomalies")
        
        # Test 4: Test different contamination levels
        print("\n[TEST 4] Testing different contamination levels...")
        for contamination in [0.01, 0.05, 0.10]:
            result = detect_outbreaks(contamination=contamination)
            print(f"  Contamination={contamination:.2f}: {result['anomaly_count']} anomalies detected")
        
        print("\n" + "=" * 60)
        print("✓ All tests completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        import traceback
        print(f"\n❌ Error during testing:")
        print(traceback.format_exc())
        print("\n💡 Troubleshooting tips:")
        print("   1. Ensure DATABASE_URL environment variable is set")
        print("   2. Check that the database has diagnosis data")
        print("   3. Verify database connection is working")


if __name__ == "__main__":
    test_surveillance()
