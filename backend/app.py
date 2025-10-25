from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from transformers import pipeline
from langdetect import detect
import numpy as np
import torch
import numpy as np
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from scipy.stats import entropy
import os
import gc

app = Flask(__name__)

# Load question banks (English and Tagalog)
with open("question_bank.json", "r", encoding="utf-8") as f:
    QUESTION_BANK_EN = json.load(f)

with open("question_bank_tagalog.json", "r", encoding="utf-8") as f:
    QUESTION_BANK_TL = json.load(f)

# Configure CORS for production
CORS(
    app,
    origins=[
        "http://localhost:3000",
        "http://aill-be-sick.vercel.app/",
        os.getenv("FRONTEND_URL", "*"),
    ],
)

eng_model_path = "notlath/BioClinical-ModernBERT-base-Symptom2Disease_WITH-DROPOUT-42"
fil_model_path = "notlath/RoBERTa-Tagalog-base-Symptom2Disease_WITH-DROPOUT-42"

# --- Configurable gating thresholds for validating symptom narratives ---
# Reject very short/off-topic inputs and low-confidence/high-uncertainty predictions
SYMPTOM_MIN_CONF = float(os.getenv("SYMPTOM_MIN_CONF", "0.50"))
SYMPTOM_MAX_MI = float(os.getenv("SYMPTOM_MAX_MI", "0.10"))
# Require at least N words OR M characters before attempting a diagnosis
SYMPTOM_MIN_WORDS = int(os.getenv("SYMPTOM_MIN_WORDS", "3"))
SYMPTOM_MIN_CHARS = int(os.getenv("SYMPTOM_MIN_CHARS", "15"))

# Medical keyword lists for semantic filtering (basic health-related terms)
MEDICAL_KEYWORDS_EN = {
    # Symptoms
    "fever",
    "cough",
    "pain",
    "ache",
    "sick",
    "ill",
    "hurt",
    "sore",
    "headache",
    "nausea",
    "vomit",
    "dizzy",
    "fatigue",
    "tired",
    "weak",
    "rash",
    "bleeding",
    "swelling",
    "infection",
    "cold",
    "chills",
    # Body parts
    "head",
    "eye",
    "throat",
    "chest",
    "stomach",
    "abdomen",
    "back",
    "muscle",
    "joint",
    "skin",
    "nose",
    "ear",
    "mouth",
    "body",
    # Medical terms
    "symptom",
    "disease",
    "diagnosis",
    "treatment",
    "medicine",
    "doctor",
    "hospital",
    "clinic",
    "health",
    "medical",
    "feel",
    "feeling",
    # Common complaints
    "breathe",
    "breathing",
    "swallow",
    "appetite",
    "sleep",
    "temperature",
}

MEDICAL_KEYWORDS_TL = {
    # Symptoms (Tagalog)
    "lagnat",
    "ubo",
    "inuubo",
    "sakit",
    "masakit",
    "sumasakit",
    "nilalagnat",
    "pananakit",
    "pagdurugo",
    "pantal",
    "singaw",
    "sipon",
    "hilo",
    "nahihilo",
    "suka",
    "nasusuka",
    "pagod",
    "kapaguran",
    "nanghihina",
    "pamumula",
    "pamamaga",
    "impeksyon",
    "ginaw",
    "panginginig",
    # Body parts (Tagalog)
    "ulo",
    "mata",
    "lalamunan",
    "dibdib",
    "tiyan",
    "likod",
    "katawan",
    "balat",
    "ilong",
    "tainga",
    "bibig",
    "kalamnan",
    "kasukasuan",
    # Medical/feeling terms (Tagalog)
    "sintomas",
    "sakit",
    "gamot",
    "doktor",
    "ospital",
    "klinika",
    "kalusugan",
    "medikal",
    "pakiramdam",
    "nararamdaman",
    "ramdam",
    "paghinga",
    "huminga",
    "lunok",
    "gana",
    "tulog",
    "temperatura",
    "meron",
    "mayroon",
}


def _count_words(text: str) -> int:
    return len([w for w in (text or "").strip().split() if w])


def _has_medical_keywords(text: str, lang: str = "en") -> bool:
    """
    Check if text contains at least one medical/health-related keyword.
    Returns True if medical keyword found, False otherwise.

    Note: Checks BOTH English and Tagalog keywords regardless of detected language
    because langdetect can misidentify Tagalog as Indonesian/Slovenian/etc.
    """
    text_lower = text.lower()

    # Check both language sets to handle langdetect misidentifications
    has_en_keyword = any(keyword in text_lower for keyword in MEDICAL_KEYWORDS_EN)
    has_tl_keyword = any(keyword in text_lower for keyword in MEDICAL_KEYWORDS_TL)

    return has_en_keyword or has_tl_keyword


class MonteCarloDropoutClassifier:
    def __init__(
        self, model_path, n_iterations=50, inference_dropout_rate=0.05, device=None
    ):
        self.n_iterations = n_iterations
        self.inference_dropout_rate = inference_dropout_rate
        self.device = (
            device if device else ("cuda" if torch.cuda.is_available() else "cpu")
        )
        self.model = AutoModelForSequenceClassification.from_pretrained(model_path)
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model.eval()

    def enable_dropout_with_rate(self, dropout_rate=None):
        """
        Enable dropout layers with a specified rate (or use default).
        For MC Dropout, use LOWER rate than training (e.g., 0.05 instead of 0.1)
        """
        if dropout_rate is None:
            dropout_rate = self.inference_dropout_rate

        for module in self.model.modules():
            if module.__class__.__name__.startswith("Dropout"):
                module.p = dropout_rate
                module.train()
            elif "Norm" in module.__class__.__name__:
                module.eval()

    def predict_with_uncertainty(self, text):
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
        )

        self.enable_dropout_with_rate(dropout_rate=self.inference_dropout_rate)

        all_predictions = []

        with torch.no_grad():
            for _ in range(self.n_iterations):
                outputs = self.model(**inputs)
                probabilities = torch.softmax(outputs.logits, dim=-1)
                all_predictions.append(probabilities.cpu().numpy())

                if _ % 10 == 0:
                    gc.collect()

        all_predictions = np.stack(all_predictions)
        mean_probs = all_predictions.mean(axis=0)
        std_probs = all_predictions.std(axis=0)
        predicted_class = mean_probs.argmax(axis=-1)
        confidence = mean_probs.max(axis=-1)
        predictive_entropy = entropy(mean_probs, axis=-1)
        mutual_information = self.compute_mutual_information(all_predictions)

        del all_predictions
        gc.collect()

        return {
            "predicted_class": predicted_class,
            "predicted_label": [
                self.model.config.id2label[idx] for idx in predicted_class
            ],
            "mean_probabilities": mean_probs,
            "std_probabilities": std_probs,
            "confidence": confidence,
            "predictive_entropy": predictive_entropy,
            "mutual_information": mutual_information,
        }

    def compute_mutual_information(self, predictions):
        """
        Compute mutual information as measure of epistemic uncertainty.
        MI = H(E[p]) - E[H(p)]
        """
        expected_entropy = np.mean([entropy(p, axis=-1) for p in predictions], axis=0)
        mean_probs = predictions.mean(axis=0)
        entropy_of_expected = entropy(mean_probs, axis=-1)
        return entropy_of_expected - expected_entropy


eng_classifier = MonteCarloDropoutClassifier(
    eng_model_path, n_iterations=25, inference_dropout_rate=0.05
)
fil_classifier = MonteCarloDropoutClassifier(
    fil_model_path, n_iterations=25, inference_dropout_rate=0.05
)


def classifier(text):
    try:
        # Pre-validate: reject very short/random text before language detection
        # This prevents langdetect from misclassifying gibberish as random languages
        if _count_words(text) < SYMPTOM_MIN_WORDS and len(text) < SYMPTOM_MIN_CHARS:
            raise ValueError("INSUFFICIENT_SYMPTOM_EVIDENCE:Text too short")

        print(f"Detecting language for text: {text}")

        # Wrap language detection in try-except to handle edge cases
        try:
            lang = detect(text)
        except Exception as lang_err:
            print(f"Language detection failed: {lang_err}")
            # Default to English if detection fails on edge cases
            lang = "en"

        print(f"Detected language: {lang}")

        # Check for medical keywords to ensure the text is health-related
        if not _has_medical_keywords(text, lang):
            raise ValueError("INSUFFICIENT_SYMPTOM_EVIDENCE:No medical keywords found")

        if lang == "en":
            print("Using English classifier...")
            result = eng_classifier.predict_with_uncertainty(text)
            pred = result["predicted_label"][0]
            confidence = float(result["confidence"][0])
            uncertainty = float(result["mutual_information"][0])
            sorted_idx = result["mean_probabilities"][0].argsort()[-5:][::-1]
            probs = []
            top_diseases = []
            # Only consider allowed diseases
            allowed = {"Dengue", "Pneumonia", "Typhoid", "Impetigo"}

            print("Result:")
            print(result)

            # iterate over all labels but only keep allowed ones, preserving probabilities
            all_probs = result["mean_probabilities"][0]
            for idx, label in eng_classifier.model.config.id2label.items():
                if label in allowed:
                    prob = float(all_probs[idx])
                    probs.append(f"{label}: {prob*100:.2f}%")
                    top_diseases.append({"disease": label, "probability": prob})

            # sort allowed diseases by probability desc
            top_diseases.sort(key=lambda x: x["probability"], reverse=True)
            probs = [
                f"{d['disease']}: {(d['probability']*100):.2f}%" for d in top_diseases
            ]
            # ensure pred is an allowed disease; if not, take top allowed
            if pred not in allowed and len(top_diseases) > 0:
                pred = top_diseases[0]["disease"]

            gc.collect()
            return (
                pred,
                confidence,
                uncertainty,
                probs,
                "BioClinical ModernBERT",
                top_diseases,
            )

        elif lang in ["tl", "fil"]:
            print("Using Tagalog classifier...")
            result = fil_classifier.predict_with_uncertainty(text)
            pred = result["predicted_label"][0]
            confidence = float(result["confidence"][0])
            uncertainty = float(result["mutual_information"][0])
            sorted_idx = result["mean_probabilities"][0].argsort()[-5:][::-1]
            probs = []
            top_diseases = []

            print("Result:")
            print(result)

            all_probs = result["mean_probabilities"][0]
            allowed = {"Dengue", "Pneumonia", "Typhoid", "Impetigo"}
            for idx, label in fil_classifier.model.config.id2label.items():
                if label in allowed:
                    prob = float(all_probs[idx])
                    probs.append(f"{label}: {prob*100:.2f}%")
                    top_diseases.append({"disease": label, "probability": prob})

            top_diseases.sort(key=lambda x: x["probability"], reverse=True)
            probs = [
                f"{d['disease']}: {(d['probability']*100):.2f}%" for d in top_diseases
            ]
            if pred not in allowed and len(top_diseases) > 0:
                pred = top_diseases[0]["disease"]

            gc.collect()
            return pred, confidence, uncertainty, probs, "RoBERTa Tagalog", top_diseases

        else:
            print(f"Unsupported language detected: {lang}")

            raise ValueError(f"UNSUPPORTED_LANGUAGE:{lang}")

    except Exception as e:
        import traceback

        error_msg = str(e)
        print(f"ERROR in classifier: {error_msg}")
        print(traceback.format_exc())

        raise


@app.route("/diagnosis/", methods=["GET"])
def index():
    """Main index endpoint"""
    return jsonify({"message": "Hello, world!"})


@app.route("/diagnosis/new", methods=["POST"])
def new_case():
    """Create new case endpoint"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        symptoms = data.get("symptoms", "").strip()

        print(f"Making diagnosis with symptoms: {symptoms}")

        if not symptoms:
            return jsonify({"error": "Symptoms cannot be empty"}), 400

        # Quick pre-filter for obviously non-symptom inputs
        if (
            _count_words(symptoms) < SYMPTOM_MIN_WORDS
            and len(symptoms) < SYMPTOM_MIN_CHARS
        ):
            return (
                jsonify(
                    {
                        "error": "INSUFFICIENT_SYMPTOM_EVIDENCE",
                        "message": "Please describe your symptoms in a short sentence (e.g., 'I have had fever and cough for two days').",
                        "details": {
                            "min_words": SYMPTOM_MIN_WORDS,
                            "min_chars": SYMPTOM_MIN_CHARS,
                        },
                    }
                ),
                422,
            )

        pred, confidence, uncertainty, probs, model_used, top_diseases = classifier(
            symptoms
        )

        # Gate low-confidence / high-uncertainty predictions
        if confidence < SYMPTOM_MIN_CONF or uncertainty > SYMPTOM_MAX_MI:
            return (
                jsonify(
                    {
                        "error": "INSUFFICIENT_SYMPTOM_EVIDENCE",
                        "message": "I'm not confident this is a symptom description. Please add a bit more detail about what you're feeling.",
                        "details": {
                            "confidence": confidence,
                            "mutual_information": uncertainty,
                            "min_conf": SYMPTOM_MIN_CONF,
                            "max_mi": SYMPTOM_MAX_MI,
                        },
                    }
                ),
                422,
            )

        return (
            jsonify(
                {
                    "data": {
                        "pred": pred,
                        "confidence": confidence,
                        "uncertainty": uncertainty,
                        "probs": probs,
                        "model_used": model_used,
                        "disease": pred,  # Add disease for follow-up
                        "top_diseases": top_diseases,  # Add top competing diseases
                    }
                }
            ),
            201,
        )

    except Exception as e:
        import traceback

        error_msg = str(e)

        print(f"Exception caught in new_case: {error_msg}")
        print(f"Exception type: {type(e)}")

        if "INSUFFICIENT_SYMPTOM_EVIDENCE:" in error_msg:
            reason = error_msg.split("INSUFFICIENT_SYMPTOM_EVIDENCE:")[1].strip()

            print(f"Insufficient symptom evidence: {reason}")

            return (
                jsonify(
                    {
                        "error": "INSUFFICIENT_SYMPTOM_EVIDENCE",
                        "message": "Please describe your symptoms in a short sentence (e.g., 'I have had fever and cough for two days').",
                        "details": {"reason": reason},
                    }
                ),
                422,
            )

        if "UNSUPPORTED_LANGUAGE:" in error_msg:
            lang = error_msg.split("UNSUPPORTED_LANGUAGE:")[1].strip()

            print(f"Detected unsupported language: {lang}")

            return (
                jsonify(
                    {
                        "error": "UNSUPPORTED_LANGUAGE",
                        "message": f"Sorry, the detected language '{lang}' is not supported. Please use English or Tagalog/Filipino.",
                        "detected_language": lang,
                    }
                ),
                400,
            )

        error_details = traceback.format_exc()
        print(f"ERROR in new_case:")
        print(error_details)
        gc.collect()
        return (
            jsonify(
                {
                    "error": "INTERNAL_ERROR",
                    "message": error_msg,
                    "details": error_details,
                }
            ),
            500,
        )


@app.route("/diagnosis/follow-up", methods=["POST"])
def follow_up_question():
    """
    Get the next follow-up question based on current diagnosis state
    Intelligently selects questions based on top competing diseases
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        current_disease = data.get("disease", "")
        confidence = data.get("confidence", 0)
        uncertainty = data.get("uncertainty", 1)
        force_question = data.get("force", False)
        mode = data.get("mode", "adaptive")  # 'adaptive' or 'legacy'
        asked_questions = data.get("asked_questions", [])
        top_diseases = data.get("top_diseases", [])  # List of {disease, probability}
        symptoms_text = data.get("symptoms", "")
        # Optional: last answer context from client (for logging/tracing)
        last_answer = data.get("last_answer")  # "yes" | "no" | None
        last_question_id = data.get("last_question_id")
        last_question_text = data.get("last_question_text")

        if last_answer and last_question_id:
            indicator = "✅ YES" if str(last_answer).lower() == "yes" else "❌ NO"
            print(
                f"🧠 Follow-up answer: {indicator} to question [{last_question_id}]"
                + (f": {last_question_text[:80]}" if last_question_text else "")
            )

        print(f"📥 Follow-up request received. Symptoms text: '{symptoms_text}'")

        # Check if too many questions have been asked - this indicates symptoms don't match well
        # Case 1: Low confidence after many questions
        # Case 2: High initial confidence but many questions with no strong match
        MAX_QUESTIONS_THRESHOLD = 8
        LOW_CONFIDENCE_THRESHOLD = 0.65
        EXHAUSTED_QUESTIONS_THRESHOLD = 10  # If we've asked this many, something's off

        if (
            len(asked_questions) >= MAX_QUESTIONS_THRESHOLD
            and confidence < LOW_CONFIDENCE_THRESHOLD
        ):
            print(
                f"🛑 Too many questions asked ({len(asked_questions)}) with low confidence ({confidence:.4f})"
            )
            return (
                jsonify(
                    {
                        "data": {
                            "should_stop": True,
                            "reason": "SYMPTOMS_NOT_MATCHING",
                            "message": "Based on your responses, your symptoms don't strongly match any of the conditions we currently cover (Dengue, Pneumonia, Typhoid, or Impetigo). We recommend consulting with a healthcare professional for a proper evaluation.",
                        }
                    }
                ),
                200,
            )

        # Also stop if we've asked too many questions regardless of confidence
        # This happens when initial symptom gives high confidence, but follow-ups don't confirm
        if len(asked_questions) >= EXHAUSTED_QUESTIONS_THRESHOLD:
            print(
                f"🛑 Exhausted questions ({len(asked_questions)}) - symptoms don't match our covered diseases"
            )
            return (
                jsonify(
                    {
                        "data": {
                            "should_stop": True,
                            "reason": "SYMPTOMS_NOT_MATCHING",
                            "message": "Based on your responses, your symptoms don't strongly match any of the conditions we currently cover (Dengue, Pneumonia, Typhoid, or Impetigo). We recommend consulting with a healthcare professional for a proper evaluation.",
                        }
                    }
                ),
                200,
            )

        # Detect language from symptoms to choose appropriate question bank
        try:
            lang = detect(symptoms_text) if symptoms_text else "en"
            print(
                f"🌐 Follow-up language detection: '{lang}' from symptoms: '{symptoms_text[:100] if symptoms_text else 'EMPTY'}'"
            )
        except Exception as e:
            print(f"⚠️  Language detection failed: {e}")
            lang = "en"  # Default to English if detection fails

        # Choose question bank based on language
        QUESTION_BANK = QUESTION_BANK_TL if lang in ["tl", "fil"] else QUESTION_BANK_EN
        print(
            f"📚 Using {'Tagalog' if lang in ['tl', 'fil'] else 'English'} question bank"
        )

        print(f"Follow-up request for {current_disease}")
        print(f"Detected language: {lang}")
        print(f"Confidence: {confidence}, Uncertainty: {uncertainty}")
        print(f"Top diseases: {top_diseases}")
        print(f"Already asked: {asked_questions}")

        # Check if we should stop asking questions
        # If not forced, stop when confidence and uncertainty thresholds are met
        if not force_question and confidence >= 0.9 and uncertainty <= 0.03:
            return (
                jsonify(
                    {"data": {"should_stop": True, "reason": "High confidence reached"}}
                ),
                200,
            )

        # Normalize symptoms with a small synonym mapping to improve triage detection
        def normalize_symptoms(text: str) -> str:
            text = (text or "").lower()
            # English synonyms
            mapping = {
                "cold": "chill",
                "feverish": "fever",
                "feverishness": "fever",
                "tired": "fatigue",
                "tire": "fatigue",
                "weak": "fatigue",
                "shortness of breath": "shortness",
                "breathing difficulty": "shortness",
                # Tagalog synonyms
                "ginaw": "lagnat",  # cold -> fever
                "nilalagnat": "lagnat",  # feverish -> fever
                "pagod": "kapaguran",  # tired -> fatigue
                "mahina": "kapaguran",  # weak -> fatigue
                "hirap huminga": "singal",  # difficulty breathing -> shortness
                "kulang sa hangin": "singal",  # lack of air -> shortness
                "ubo": "pag-ubo",  # cough (normalize)
            }
            for k, v in mapping.items():
                text = text.replace(k, v)
            return text

        symptoms_text = normalize_symptoms(data.get("symptoms") or "")
        # If initial symptoms indicate feeling cold/fever/fatigue but do not mention cough/breathing, ask a general respiratory triage question
        # Skip triage when in legacy (simple) mode
        # Check both English and Tagalog keywords
        has_fever_fatigue = any(
            k in symptoms_text
            for k in [
                "chill",
                "fever",
                "fatigue",
                "lagnat",
                "ginaw",
                "kapaguran",
                "pagod",
            ]
        )
        has_respiratory = any(
            k in symptoms_text
            for k in [
                "cough",
                "breath",
                "chest",
                "shortness",
                "ubo",
                "singal",
                "dibdib",
                "hirap",
            ]
        )

        if mode != "legacy" and has_fever_fatigue and not has_respiratory:
            # Choose triage question based on language
            if lang in ["tl", "fil"]:
                triage_question = {
                    "id": "triage_resp_1",
                    "question": "Mayroon ka bang ubo, pananakit ng dibdib, o hirap sa paghinga?",
                    "positive_symptom": "Mayroon akong ubo, pananakit ng dibdib, o hirap sa paghinga",
                    "negative_symptom": "Wala akong ubo, pananakit ng dibdib, o hirap sa paghinga",
                    "category": "triage",
                }
            else:
                triage_question = {
                    "id": "triage_resp_1",
                    "question": "Do you have cough, chest pain, or difficulty breathing?",
                    "positive_symptom": "I have cough, chest pain, or difficulty breathing",
                    "negative_symptom": "I don't have cough, chest pain, or difficulty breathing",
                    "category": "triage",
                }

            return (
                jsonify({"data": {"should_stop": False, "question": triage_question}}),
                200,
            )

        # Get questions for the current top disease
        if current_disease not in QUESTION_BANK:
            return (
                jsonify(
                    {"error": f"No questions available for disease: {current_disease}"}
                ),
                400,
            )

        primary_questions = QUESTION_BANK[current_disease]

        # Filter out already asked questions
        available_questions = [
            q for q in primary_questions if q["id"] not in asked_questions
        ]

        if not available_questions:
            return (
                jsonify(
                    {
                        "data": {
                            "should_stop": True,
                            "reason": "No more questions available",
                        }
                    }
                ),
                200,
            )

        # INTELLIGENT SELECTION:
        # If there are competing diseases (close probabilities),
        # prioritize questions that discriminate between them
        selected_question = None
        # Use symptom hints to prefer certain disease questions (e.g., respiratory)
        symptom_text = normalize_symptoms(data.get("symptoms") or "")
        # Keywords in both English and Tagalog
        respiratory_keywords = [
            "cough",
            "breath",
            "shortness",
            "chest",
            "phlegm",
            "sputum",
            "wheeze",
            "wheezing",
            "ubo",
            "pag-ubo",
            "singal",
            "dibdib",
            "plema",
            "hirap",
            "hangin",  # Tagalog
        ]
        fatigue_keywords = [
            "fatigue",
            "tired",
            "weak",
            "tire",
            "kapaguran",
            "pagod",
            "mahina",  # Tagalog
        ]
        feverish_keywords = [
            "chill",
            "fever",
            "shiver",
            "shivering",
            "lagnat",
            "ginaw",
            "nilalagnat",
            "panginginig",  # Tagalog
        ]
        prefers_pneumonia = any(k in symptom_text for k in respiratory_keywords)
        indicates_fever_or_fatigue = any(
            k in symptom_text for k in fatigue_keywords + feverish_keywords
        )
        if mode != "legacy" and prefers_pneumonia and "Pneumonia" in QUESTION_BANK:
            # Insert pneumonia questions at the front of available_questions if not already asked
            pneumonia_questions = [
                q for q in QUESTION_BANK["Pneumonia"] if q["id"] not in asked_questions
            ]
            if pneumonia_questions:
                available_questions = pneumonia_questions + [
                    q for q in available_questions if q not in pneumonia_questions
                ]

        # If user mentions fever/chills/tiredness but doesn't mention respiratory words, prefer to triage respiratory first
        if mode != "legacy" and indicates_fever_or_fatigue and not prefers_pneumonia:
            # Return the triage question for respiratory symptoms
            return (
                jsonify(
                    {
                        "data": {
                            "should_stop": False,
                            "question": {
                                "id": "triage_resp_1",
                                "question": "Do you have cough, chest pain, or difficulty breathing?",
                                "positive_symptom": "I have cough, chest pain, or difficulty breathing",
                                "negative_symptom": "I don't have cough, chest pain, or difficulty breathing",
                                "category": "triage",
                            },
                        }
                    }
                ),
                200,
            )

        # Skip discrimination logic in legacy mode (simple sequential questions)
        if mode != "legacy" and len(top_diseases) >= 2:
            # Get second disease and its probability
            second_disease = top_diseases[1]["disease"]
            prob_diff = abs(
                top_diseases[0]["probability"] - top_diseases[1]["probability"]
            )

            print(
                f"Close competition: {current_disease} vs {second_disease}, diff: {prob_diff}"
            )

            # If diseases are close (within 20%), find discriminating question
            if prob_diff < 0.2 and second_disease in QUESTION_BANK:
                secondary_questions = QUESTION_BANK[second_disease]

                # Find questions unique to primary disease (not in secondary)
                secondary_question_texts = {q["question"] for q in secondary_questions}
                discriminating_questions = [
                    q
                    for q in available_questions
                    if q["question"] not in secondary_question_texts
                ]

                if discriminating_questions:
                    # Pick the highest-weighted discriminating question
                    selected_question = max(
                        discriminating_questions, key=lambda q: q["weight"]
                    )
                    print(
                        f"Selected discriminating question: {selected_question['id']}"
                    )

        # If no discriminating question found, use standard priority
        if not selected_question:
            # Prioritize: primary category first, then by weight
            selected_question = max(
                available_questions,
                key=lambda q: (q["category"] == "primary", q["weight"]),
            )
            print(f"Selected standard question: {selected_question['id']}")

        print(f"🎯 Returning question: {selected_question['question'][:50]}...")

        return (
            jsonify(
                {
                    "data": {
                        "should_stop": False,
                        "question": {
                            "id": selected_question["id"],
                            "question": selected_question["question"],
                            "positive_symptom": selected_question["positive_symptom"],
                            "negative_symptom": selected_question["negative_symptom"],
                            "category": selected_question["category"],
                        },
                    }
                }
            ),
            200,
        )

    except Exception as e:
        import traceback

        error_msg = str(e)
        error_details = traceback.format_exc()
        print(f"ERROR in follow_up_question:")
        print(error_details)
        return (
            jsonify(
                {
                    "error": "INTERNAL_ERROR",
                    "message": error_msg,
                    "details": error_details,
                }
            ),
            500,
        )


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Method not allowed"}), 405


if __name__ == "__main__":
    port = int(os.getenv("PORT", 10000))
    app.run(debug=False, host="0.0.0.0", port=port)
