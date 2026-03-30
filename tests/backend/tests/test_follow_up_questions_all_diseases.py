import json
from app import app, QUESTION_BANK


def test_follow_up_returns_question_for_all_diseases():
    client = app.test_client()

    for disease, questions in QUESTION_BANK.items():
        payload = {
            "disease": disease,
            "confidence": 0.2,
            "uncertainty": 0.5,
            "asked_questions": [],
            "top_diseases": [{"disease": disease, "probability": 0.5}],
            "symptoms": "",
        }

        res = client.post("/diagnosis/follow-up", data=json.dumps(payload), content_type="application/json")
        assert res.status_code == 200
        data = res.get_json()["data"]
        assert data is not None
        # If triage question is returned there is a triage id, otherwise ensure question id in question bank
        if data.get("question"):
            qid = data["question"]["id"]
            assert qid == "triage_resp_1" or qid in [q["id"] for q in questions]
        else:
            assert not data.get("should_stop", False)
