from dotenv import load_dotenv
from classifier import classifier
from pprint import pprint

load_dotenv()

symptoms = "For the last five days, I've been running a fever of 103.8°F. It's accompanied by a severe, pounding headache, aches all over my body, and a really distinct pain behind my eyes. A rash also showed up on my legs, which started three days after the fever did."

try:
    print("[INPUT SYMPTOMS]")
    print(symptoms)

    result = classifier(symptoms)

    print("[RESULT]")
    pprint(result)
except Exception as e:
    error_msg = str(e)
    print(f"[ERROR] {error_msg}")

    if "INSUFFICIENT_SYMPTOM_EVIDENCE" in error_msg:
        print({"error": "INSUFFICIENT_SYMPTOM_EVIDENCE",
              "message": "Not enough symptom evidence provided."})
    elif "UNSUPPORTED_LANGUAGE" in error_msg:
        lang = error_msg.split(":")[1]
        print({"error": "UNSUPPORTED_LANGUAGE",
              "message": f"Language '{lang}' is not supported."})
    else:
        print({"error": "INTERNAL_SERVER_ERROR",
              "message": "An internal server error occurred."})
