import json
from app import app


def test_follow_up_flow():
    client = app.test_client()

    # initial ambiguous symptom input
    payload = {
        "symptoms": "I feel cold and tired",
    }
    res = client.post("/diagnosis/new", data=json.dumps(payload), content_type="application/json")
    assert res.status_code == 201
    data = res.get_json()["data"]
    # must return top_diseases
    assert "top_diseases" in data

    # Request follow-up question
    follow_payload = {
        "disease": data["disease"],
        "confidence": data["confidence"],
        "uncertainty": data["uncertainty"],
        "symptoms": payload["symptoms"],
        "asked_questions": [],
        "top_diseases": data["top_diseases"]
    }
    follow_res = client.post("/diagnosis/follow-up", data=json.dumps(follow_payload), content_type="application/json")
    assert follow_res.status_code == 200
    follow_data = follow_res.get_json()["data"]
    assert follow_data["question"]["id"] == "triage_resp_1"

    # Simulate user answer positive for triage question
    symptoms_plus = payload["symptoms"] + ", I have cough"
    res2 = client.post("/diagnosis/new", data=json.dumps({"symptoms": symptoms_plus}), content_type="application/json")
    assert res2.status_code == 201
    data2 = res2.get_json()["data"]
    # After adding cough, Pneumonia should be in top_diseases
    assert any(d["disease"] == "Pneumonia" for d in data2["top_diseases"])