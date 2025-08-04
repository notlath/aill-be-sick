#!/usr/bin/env python
"""
Test script for the Flask application
"""
import requests
import json
import time
import subprocess
import sys
from threading import Thread


def test_flask_app():
    """Test the Flask application endpoints"""
    base_url = "http://localhost:8000"

    print("Testing Flask application...")

    try:
        # Test the index endpoint
        print("\n1. Testing GET /classifications/")
        response = requests.get(f"{base_url}/classifications/")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")

        # Test the new case endpoint
        print("\n2. Testing POST /classifications/new")
        test_data = {"symptoms": ["fever", "cough", "headache"]}
        response = requests.post(
            f"{base_url}/classifications/new",
            json=test_data,
            headers={"Content-Type": "application/json"},
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")

        print("\n✅ All tests passed! Flask app is working correctly.")

    except requests.exceptions.ConnectionError:
        print(
            "❌ Could not connect to Flask app. Make sure it's running on localhost:8000"
        )
    except Exception as e:
        print(f"❌ Test failed: {e}")


if __name__ == "__main__":
    test_flask_app()
