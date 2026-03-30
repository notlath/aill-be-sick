import json
from app import app


def test_triage_for_cold_and_tired():
    client = app.test_client()
    payload = {
        "disease": "Typhoid",
        "confidence": 0.5,
        "uncertainty": 0.2,
        "symptoms": "I feel cold and tired",
        "asked_questions": [],
        "top_diseases": [{"disease": "Typhoid", "probability": 0.45}, {"disease": "Pneumonia", "probability": 0.40}]
    }

    response = client.post("/diagnosis/follow-up", data=json.dumps(payload), content_type="application/json")
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert "data" in data
    # triage question id
    assert data["data"]["question"]["id"] == "triage_resp_1"
    assert "Do you have cough" in data["data"]["question"]["question"]
