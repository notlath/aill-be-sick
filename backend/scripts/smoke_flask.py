"""Manual smoke test for Flask endpoints (not picked up by pytest)

Usage:
    python scripts/smoke_flask.py
"""
import requests


def run_smoke_tests(host="http://localhost:10000"):
    print("Running smoke tests against", host)
    try:
        r = requests.get(f"{host}/diagnosis/")
        print("GET /diagnosis/ ->", r.status_code, r.text)

        payload = {"symptoms": "fever, cough"}
        r = requests.post(f"{host}/diagnosis/new", json=payload)
        print("POST /diagnosis/new ->", r.status_code, r.text)
    except requests.exceptions.RequestException as e:
        print("Error contacting server:", e)


if __name__ == "__main__":
    run_smoke_tests()
