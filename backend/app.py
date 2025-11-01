from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from transformers import pipeline
from langdetect import detect_langs
import numpy as np
import torch
import numpy as np
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from scipy.stats import entropy
import os
import gc
from captum.attr import GradientShap
import html
import unicodedata
import torch.nn.functional as F
from dotenv import load_dotenv
import traceback

# Load environment variables from .env file
load_dotenv()

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
# Soft-accept band: allow follow-ups to proceed when signal exists but is below hard threshold
SYMPTOM_SOFT_MIN_CONF = float(os.getenv("SYMPTOM_SOFT_MIN_CONF", "0.35"))
SYMPTOM_SOFT_MAX_MI = float(os.getenv("SYMPTOM_SOFT_MAX_MI", "0.12"))
# Require at least N words OR M characters before attempting a diagnosis
SYMPTOM_MIN_WORDS = int(os.getenv("SYMPTOM_MIN_WORDS", "3"))
SYMPTOM_MIN_CHARS = int(os.getenv("SYMPTOM_MIN_CHARS", "15"))

# Medical keyword lists for semantic filtering (basic health-related terms)
MEDICAL_KEYWORDS_EN = {
    # Symptoms - General (from dataset analysis)
    "fever",
    "pain",
    "ache",
    "aches",
    "chills",
    "weak",
    "weakness",
    "sick",
    "ill",
    "hurt",
    "sore",
    "sores",
    "headache",
    "headaches",
    "dizzy",
    "dizziness",
    "fatigue",
    "fatigued",
    "tired",
    "exhausted",
    "exhaustion",
    "sweating",
    "sweat",
    "sweats",
    "bleeding",
    "swelling",
    "infection",
    "cold",
    "painful",
    # GI/Digestive symptoms
    "nausea",
    "nauseated",
    "vomit",
    "vomiting",
    "vomited",
    "diarrhea",
    "diarrhoea",
    "constipation",
    "constipated",
    "bloat",
    "bloating",
    "bloated",
    "cramp",
    "cramps",
    "cramping",
    "gas",
    "indigestion",
    "heartburn",
    "reflux",
    "appetite",
    "nauseous",
    "bowel",
    "stool",
    "stools",
    # Respiratory symptoms
    "cough",
    "coughing",
    "coughed",
    "phlegm",
    "mucus",
    "sputum",
    "breathing",
    "breathe",
    "breath",
    "shortness",
    "wheeze",
    "wheezing",
    "congestion",
    "congested",
    "runny",
    "stuffy",
    # Skin symptoms
    "rash",
    "rashes",
    "itchy",
    "itching",
    "itch",
    "blister",
    "blisters",
    "blistering",
    "lesion",
    "lesions",
    "wound",
    "wounds",
    "pus",
    "discharge",
    "spots",
    "bumps",
    # Body parts
    "head",
    "eye",
    "eyes",
    "nose",
    "throat",
    "chest",
    "stomach",
    "abdomen",
    "abdominal",
    "belly",
    "back",
    "muscle",
    "muscles",
    "joint",
    "joints",
    "skin",
    "ear",
    "ears",
    "mouth",
    "body",
    "face",
    "neck",
    "arms",
    "legs",
    "lung",
    "lungs",
    "heart",
    # Medical/health terms
    "symptom",
    "symptoms",
    "disease",
    "diagnosis",
    "treatment",
    "medicine",
    "medication",
    "doctor",
    "hospital",
    "clinic",
    "health",
    "medical",
    "feel",
    "feeling",
    "feels",
    # Common descriptors
    "severe",
    "mild",
    "constant",
    "uncomfortable",
    "discomfort",
    "difficult",
    "trouble",
    "suffering",
    "temperature",
    "racing",
    "rapid",
}

MEDICAL_KEYWORDS_TL = {
    # Symptoms (Tagalog) - from dataset analysis
    "lagnat",
    "nilalagnat",
    "nilagnat",
    "ubo",
    "inuubo",
    "umuubo",
    "sakit",
    "masakit",
    "sumasakit",
    "pananakit",
    "pains",
    "pagdurugo",
    "pantal",
    "singaw",
    "sipon",
    "hilo",
    "nahihilo",
    "suka",
    "nasusuka",
    "pagsusuka",
    "sumuka",
    "pagod",
    "napagod",
    "kapaguran",
    "nanghihina",
    "mahina",
    "panghihina",
    "pamumula",
    "pamamaga",
    "namamaga",
    "impeksyon",
    "ginaw",
    "giniginaw",
    "panginginig",
    "nanginginig",
    # GI symptoms (Tagalog)
    "pagtatae",
    "nagtae",
    "diarrhea",
    "diarrhoea",
    "constipation",
    "tibi",
    "pagtitibi",
    "pag-tibi",
    "pamamaga ng tiyan",
    "pulikat",
    "kabag",
    "almoranas",
    "gana",
    "nawalan",
    # Respiratory (Tagalog)
    "plema",
    "plemang",
    "hirap",
    "nahihirapan",
    "huminga",
    "paghinga",
    "hininga",
    "lalamunan",
    "lalamunan",
    # Skin symptoms (Tagalog)
    "sugat",
    "paltos",
    "makati",
    "pantal",
    "pulang",
    "pamumula",
    "lumalabas",
    "likido",
    # Body parts (Tagalog)
    "ulo",
    "mata",
    "dibdib",
    "tiyan",
    "puson",
    "likod",
    "katawan",
    "balat",
    "ilong",
    "tainga",
    "bibig",
    "kalamnan",
    "kasukasuan",
    "mukha",
    "leeg",
    "braso",
    "binti",
    "puso",
    "tibok",
    # Medical/feeling terms (Tagalog)
    "sintomas",
    "gamot",
    "doktor",
    "ospital",
    "klinika",
    "kalusugan",
    "medikal",
    "pakiramdam",
    "nararamdaman",
    "ramdam",
    "nakakaramdam",
    "lunok",
    "tulog",
    "temperatura",
    "meron",
    "mayroon",
    "nakakaabala",
    "hindi komportable",
    "sobrang",
    "matinding",
    "mataas",
    "mabilis",
    "pawis",
    "pinagpapawisan",
    "paminsang",
    "patuloy",
    "palaging",
    "kumain",
    "labis",
    "aalala",
    "nag-aalala",
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


class MCDClassifierWithSHAP:
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
        ).to(
            self.device
        )  # Move inputs to device and ensure correct type
        inputs["input_ids"] = inputs["input_ids"].to(torch.long)
        inputs["attention_mask"] = inputs["attention_mask"].to(torch.long)

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

    def explain_with_gradient_shap(
        self, text, mean_probs=None, target_class=None, n_baselines=5
    ):
        """
        Compute token-level attributions using Captum's GradientSHAP on embeddings.
        """
        self.model.zero_grad()

        # Tokenize input
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
        ).to(self.device)

        mean_probs = torch.tensor(mean_probs, device=self.device)
        predicted_class = (
            mean_probs.argmax(dim=-1).item() if target_class is None else target_class
        )

        # 1️⃣ Get embeddings from the model
        embeddings = self.model.get_input_embeddings()(inputs["input_ids"])

        # 2️⃣ Define a forward function that takes embeddings
        def forward_func(embeds):
            attention_mask = inputs["attention_mask"]
            outputs = self.model(inputs_embeds=embeds, attention_mask=attention_mask)
            probs = F.softmax(outputs.logits, dim=-1)
            return probs[:, predicted_class]

        # 3️⃣ Create random baselines around zero embeddings
        baseline_embeds = torch.zeros_like(embeddings).repeat(n_baselines, 1, 1)

        # 4️⃣ Initialize GradientSHAP
        gradient_shap = GradientShap(forward_func)

        # 5️⃣ Compute attributions on embeddings
        attributions, delta = gradient_shap.attribute(
            embeddings,
            baselines=baseline_embeds,
            n_samples=25,
            stdevs=0.01,
            return_convergence_delta=True,
        )

        # 6️⃣ Aggregate across embedding dimensions (token-level importance)
        token_attributions = attributions.sum(dim=-1).squeeze().detach().cpu()

        # 7️⃣ Decode tokens
        tokens = self.tokenizer.convert_ids_to_tokens(
            inputs["input_ids"][0].detach().cpu().numpy()
        )

        # 8️⃣ Normalize to [0, 1]
        token_attributions = (token_attributions - token_attributions.min()) / (
            token_attributions.max() - token_attributions.min() + 1e-8
        )

        explanation = list(zip(tokens, token_attributions.numpy().tolist()))

        # Derive confidence from provided mean_probs (if available) instead
        # of relying on an external mc_result variable which isn't in scope.
        try:
            # mean_probs may be a torch tensor here
            mp = (
                mean_probs.detach().cpu().numpy()
                if hasattr(mean_probs, "detach")
                else np.array(mean_probs)
            )
            confidence_val = float(np.max(mp, axis=-1).tolist()) if mp.size else 0.0
        except Exception:
            confidence_val = 0.0

        # We cannot compute mutual information without the full MC samples here,
        # so return None to indicate it's unavailable when only mean_probs supplied.
        mi_val = None

        return {
            "tokens": tokens,
            "attributions": token_attributions.numpy().tolist(),
            "predicted_label": self.model.config.id2label[predicted_class],
            "confidence": confidence_val,
            "mutual_information": mi_val,
            "explanation": explanation,
        }


eng_classifier = MCDClassifierWithSHAP(
    eng_model_path, n_iterations=25, inference_dropout_rate=0.05
)
fil_classifier = MCDClassifierWithSHAP(
    fil_model_path, n_iterations=25, inference_dropout_rate=0.05
)


def _detect_red_flags(text: str) -> list:
    """Very simple keyword-based red flag detection (EN/TL).
    This complements ML with rule-based triage cues.
    """
    t = (text or "").lower()
    red_flags = []

    # Respiratory difficulty
    if any(
        k in t
        for k in [
            "difficulty breathing",
            "shortness of breath",
            "can't breathe",
            "cannot breathe",
            "hirap sa paghinga",
            "hirap huminga",
            "kulang sa hangin",
            "singal",
        ]
    ):
        red_flags.append("Respiratory difficulty")

    # Chest pain
    if any(
        k in t
        for k in [
            "chest pain",
            "pananakit ng dibdib",
            "sakit sa dibdib",
            "chest tightness",
        ]
    ):
        red_flags.append("Chest pain")

    # Bleeding
    if any(
        k in t
        for k in [
            "bleeding",
            "mucosal bleed",
            "pagdurugo",
            "dumudugo",
            "nosebleed",
            "nose bleed",
        ]
    ):
        red_flags.append("Active bleeding")

    # Severe abdominal pain or persistent vomiting (dengue warning sign proxy)
    if any(
        k in t
        for k in [
            "severe abdominal pain",
            "matinding pananakit ng tiyan",
            "persistent vomiting",
            "tuloy-tuloy na pagsusuka",
            "vomiting for",
            "walang tigil na pagsusuka",
        ]
    ):
        red_flags.append("Severe abdominal pain or persistent vomiting")

    return red_flags


def _build_cdss_payload(
    symptoms: str,
    disease: str,
    confidence: float,
    uncertainty: float,
    top_diseases: list,
    model_used: str,
) -> dict:
    """Construct a structured CDSS payload to accompany narrative output."""
    red_flags = _detect_red_flags(symptoms)

    # Triage determination
    if red_flags:
        triage_level = "Emergent"
        triage_reasons = ["One or more red flags present"] + red_flags
        care_setting = "ER"
        actions = [
            "Seek emergency evaluation immediately",
            "Avoid delays; consider calling local emergency number",
        ]
    else:
        if confidence >= 0.90 and uncertainty <= 0.03:
            triage_level = "Non-urgent"
            triage_reasons = [
                "High model confidence (≥ 0.90)",
                "Low uncertainty (≤ 0.03)",
            ]
            care_setting = "Home care or routine clinic"
            actions = [
                "Home care guidance and monitoring",
                "Consider routine clinic follow-up if symptoms persist or worsen",
            ]
        else:
            triage_level = "Urgent"
            triage_reasons = [
                "Model requires clinician review due to confidence/uncertainty"
            ]
            care_setting = "Clinic visit"
            actions = [
                "Consult a healthcare professional",
                "Provide additional history, vitals, and exam if available",
            ]

    # Differential list from top_diseases (already sorted in caller)
    differential = [
        {
            "code": None,  # placeholder for future coding (e.g., SNOMED)
            "label": td.get("disease"),
            "prob": float(td.get("probability", 0.0)),
        }
        for td in (top_diseases or [])
    ]

    # Minimal knowledge references (non-exhaustive placeholders)
    knowledge = [
        {
            "topic": "Dengue warning signs",
            "source": "WHO guidance",
            "link": "https://www.who.int/health-topics/dengue-and-severe-dengue",
        },
        {
            "topic": "Community-acquired pneumonia assessment",
            "source": "General clinical references",
            "link": "https://www.cdc.gov/pneumonia/index.html",
        },
    ]

    payload = {
        "differential": differential,
        "triage": {
            "level": triage_level,
            "reasons": triage_reasons,
        },
        "red_flags": red_flags,
        "recommendation": {
            "care_setting": care_setting,
            "actions": actions,
            "rationale": [
                f"Primary: {disease}",
                f"Confidence: {confidence:.3f}",
                f"Uncertainty: {uncertainty:.3f}",
            ],
        },
        "knowledge": knowledge,
        "meta": {
            "model": model_used,
            "model_version": (
                eng_model_path if "ModernBERT" in model_used else fil_model_path
            ),
            "thresholds": {
                "hard_min_conf": SYMPTOM_MIN_CONF,
                "soft_min_conf": SYMPTOM_SOFT_MIN_CONF,
                "hard_max_mi": SYMPTOM_MAX_MI,
                "soft_max_mi": SYMPTOM_SOFT_MAX_MI,
            },
        },
    }

    return payload


def classifier(text):
    try:
        # Pre-validate: reject very short/random text before language detection
        # This prevents langdetect from misclassifying gibberish as random languages
        if _count_words(text) < SYMPTOM_MIN_WORDS and len(text) < SYMPTOM_MIN_CHARS:
            raise ValueError("INSUFFICIENT_SYMPTOM_EVIDENCE:Text too short")

        """
        Language Detection Strategy:
        ---------------------------
        This block uses langdetect's `detect_langs` to obtain language probabilities for the input text.
        However, langdetect can misidentify short or medical symptom narratives (especially Tagalog) as unrelated languages (e.g., Indonesian, Slovenian).
        To address this, we implement a fallback strategy:
          1. Attempt to detect if English ('en'), Tagalog ('tl'), or Filipino ('fil') are among the top candidates.
          2. If not, use medical keyword matching to infer the language:
             - If only English keywords are present, set language to 'en'.
             - If only Tagalog keywords are present, set language to 'tl'.
             - If both or ambiguous, default to 'en'.
             - If neither, use the top detected language even if unsupported.
        This ensures robust handling of edge cases and improves reliability for medical symptom inputs.
        """

        # Wrap language detection in try-except to handle edge cases
        try:
            # Get language probabilities instead of just top language
            lang_probs = detect_langs(text)

            # Check if English or Tagalog/Filipino are in top candidates
            supported_langs = {"en", "tl", "fil"}
            detected_lang = None

            for lang_prob in lang_probs:
                if lang_prob.lang in supported_langs:
                    detected_lang = lang_prob.lang
                    print(
                        f"[LANG] Detected: {lang_prob.lang} (confidence: {lang_prob.prob:.2f})"
                    )
                    break

            # If no supported language found, check for medical keywords to determine language
            if detected_lang is None:
                text_lower = text.lower()
                has_en_keyword = any(
                    keyword in text_lower for keyword in MEDICAL_KEYWORDS_EN
                )
                has_tl_keyword = any(
                    keyword in text_lower for keyword in MEDICAL_KEYWORDS_TL
                )

                top_lang = lang_probs[0].lang if lang_probs else "unknown"

                if has_en_keyword and not has_tl_keyword:
                    detected_lang = "en"
                    print(f"[LANG] Fallback: {top_lang} → en (English keywords found)")
                elif has_tl_keyword and not has_en_keyword:
                    detected_lang = "tl"
                    print(f"[LANG] Fallback: {top_lang} → tl (Tagalog keywords found)")
                elif has_en_keyword or has_tl_keyword:
                    # Both or ambiguous, default to English
                    detected_lang = "en"
                    print(f"[LANG] Fallback: {top_lang} → en (ambiguous keywords)")
                else:
                    # Use the top detected language even if unsupported
                    detected_lang = top_lang

            lang = detected_lang

        except Exception as lang_err:
            print(f"[LANG] Detection failed: {lang_err}, defaulting to en")
            # Default to English if detection fails on edge cases
            lang = "en"

        # Check for medical keywords to ensure the text is health-related
        if not _has_medical_keywords(text, lang):
            raise ValueError("INSUFFICIENT_SYMPTOM_EVIDENCE:No medical keywords found")

        if lang == "en":
            print("[CLASSIFIER] Using English BioClinical ModernBERT model")
            result = eng_classifier.predict_with_uncertainty(text)
            pred = result["predicted_label"][0]
            confidence = float(result["confidence"][0])
            uncertainty = float(result["mutual_information"][0])
            sorted_idx = result["mean_probabilities"][0].argsort()[-5:][::-1]
            probs = []
            top_diseases = []
            # Only consider allowed diseases
            allowed = {"Dengue", "Pneumonia", "Typhoid", "Impetigo"}

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
            mean_probs = result["mean_probabilities"].tolist()

            print(f"[RESULT] {pred} (conf: {confidence:.3f}, MI: {uncertainty:.4f})")

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
                mean_probs,
            )

        elif lang in ["tl", "fil"]:
            print("[CLASSIFIER] Using Tagalog RoBERTa model")
            result = fil_classifier.predict_with_uncertainty(text)
            pred = result["predicted_label"][0]
            confidence = float(result["confidence"][0])
            uncertainty = float(result["mutual_information"][0])
            sorted_idx = result["mean_probabilities"][0].argsort()[-5:][::-1]
            probs = []
            top_diseases = []
            mean_probs = result["mean_probabilities"].tolist()

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

            print(f"[RESULT] {pred} (conf: {confidence:.3f}, MI: {uncertainty:.4f})")

            if pred not in allowed and len(top_diseases) > 0:
                pred = top_diseases[0]["disease"]

            gc.collect()
            return (
                pred,
                confidence,
                uncertainty,
                probs,
                "RoBERTa Tagalog",
                top_diseases,
                mean_probs,
            )

        else:
            print(f"Unsupported language detected: {lang}")

            raise ValueError(f"UNSUPPORTED_LANGUAGE:{lang}")

    except Exception as e:
        import traceback

        error_msg = str(e)
        print(f"ERROR in classifier: {error_msg}")
        print(traceback.format_exc())

        raise


def aggregate_subword_attributions(tokens, attributions):
    """
    Merge subword tokens (e.g., Ġirrit + ating -> 'irritating')
    and sum their attributions to produce word-level importance.
    Works for both BPE (Ġ) and WordPiece (##) style tokenizers.
    """
    words = []
    word_attrs = []
    current_word = ""
    current_attr = 0.0

    for token, attr in zip(tokens, attributions):
        if token in ["[CLS]", "[SEP]", "[PAD]"]:
            continue

        if token.startswith("Ġ"):
            if current_word:
                words.append(current_word.strip())
                word_attrs.append(current_attr)
            current_word = token.replace("Ġ", " ")
            current_attr = attr

        elif token.startswith("##"):
            current_word += token[2:]
            current_attr += attr

        else:
            if current_word and current_word.endswith(" "):
                words.append(current_word.strip())
                word_attrs.append(current_attr)
                current_word = token
                current_attr = attr
            else:
                current_word += token
                current_attr += attr

    if current_word:
        words.append(current_word.strip())
        word_attrs.append(current_attr)

    return words, np.array(word_attrs)


def clean_token(t):
    # Decode weird UTF-8 artifacts and normalize apostrophes
    t = t.encode("utf-8", "ignore").decode("utf-8", "ignore")
    t = t.replace("âĢĻ", "'").replace("â€™", "'").replace("’", "'").replace("‘", "'")
    t = html.unescape(t)  # decode HTML entities like &amp;
    t = unicodedata.normalize("NFKC", t)
    return t.strip()


def explainer(text: str, mean_probs=None):
    try:
        # Language hint: prefer Tagalog if Tagalog keywords appear
        text_lower = (text or "").lower()
        has_tl = any(k in text_lower for k in MEDICAL_KEYWORDS_TL)
        lang = "tl" if has_tl else "en"

        # Normalize mean_probs to a numpy array/list for downstream use
        if mean_probs is None:
            raise ValueError("mean_probs required for explainer")

        # Accept either nested list, numpy array, or torch tensor
        try:
            if hasattr(mean_probs, "tolist") and not isinstance(mean_probs, list):
                mean_probs_list = mean_probs.tolist()
            else:
                mean_probs_list = mean_probs
        except Exception:
            mean_probs_list = mean_probs

        # Convert to numpy for operations inside explain_with_gradient_shap
        mean_probs_arr = np.array(mean_probs_list)

        # Choose the right model for language
        model = eng_classifier if lang == "en" else fil_classifier

        # explain_with_gradient_shap expects mean_probs as a tensor or array
        explanation_result = model.explain_with_gradient_shap(
            text, mean_probs=mean_probs_arr
        )

        tokens = explanation_result["tokens"]
        attrs = explanation_result["attributions"]

        words, word_attrs = aggregate_subword_attributions(tokens, attrs)
        words = [clean_token(w) for w in words]

        # Ensure the returned structure is JSON serializable: convert arrays to lists
        explanation_result["mean_probs"] = mean_probs_arr.tolist()

        return {
            "symptoms": text,
            "tokens": [
                {"token": w, "importance": float(a)} for w, a in zip(words, word_attrs)
            ],
        }

    except Exception:
        traceback.print_exc()
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

        print(f"\n[NEW CASE] Symptoms: {symptoms}")

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

        pred, confidence, uncertainty, probs, model_used, top_diseases, mean_probs = (
            classifier(symptoms)
        )

        # EARLY STOP: If initial diagnosis is very confident, skip follow-up questions entirely
        if confidence >= 0.95 and uncertainty <= 0.01:
            print(
                f"[NEW CASE] STOP: Very high confidence on initial diagnosis (conf={confidence:.3f}, MI={uncertainty:.4f})"
            )
            cdss = _build_cdss_payload(
                symptoms,
                pred,
                confidence,
                uncertainty,
                top_diseases,
                model_used,
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
                            "disease": pred,
                            "top_diseases": top_diseases,
                            "mean_probs": mean_probs,
                            "cdss": cdss,
                            "skip_followup": True,  # Signal to frontend to skip follow-up questions
                            "skip_reason": "HIGH_CONFIDENCE_INITIAL",
                        }
                    }
                ),
                201,
            )

        # Gate low-confidence / high-uncertainty predictions
        if confidence < SYMPTOM_MIN_CONF or uncertainty > SYMPTOM_MAX_MI:
            # If it's within the soft band, proceed with a low-confidence advisory
            if (
                confidence >= SYMPTOM_SOFT_MIN_CONF
                and uncertainty <= SYMPTOM_SOFT_MAX_MI
            ):
                cdss = _build_cdss_payload(
                    symptoms,
                    pred,
                    confidence,
                    uncertainty,
                    top_diseases,
                    model_used,
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
                                "disease": pred,
                                "top_diseases": top_diseases,
                                "mean_probs": mean_probs,
                                "cdss": cdss,
                                "advisory": {
                                    "low_confidence": True,
                                    "message": "We couldn't confidently match your symptoms yet. We'll ask a few targeted questions to narrow it down.",
                                    "thresholds": {
                                        "hard_min_conf": SYMPTOM_MIN_CONF,
                                        "soft_min_conf": SYMPTOM_SOFT_MIN_CONF,
                                        "hard_max_mi": SYMPTOM_MAX_MI,
                                        "soft_max_mi": SYMPTOM_SOFT_MAX_MI,
                                    },
                                },
                            }
                        }
                    ),
                    201,
                )

            # Otherwise, ask user for more detail (hard rejection)
            return (
                jsonify(
                    {
                        "error": "INSUFFICIENT_SYMPTOM_EVIDENCE",
                        "message": "We couldn't confidently match your symptoms to a condition yet. Please add more details like duration, severity, and other symptoms.",
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

        cdss = _build_cdss_payload(
            symptoms,
            pred,
            confidence,
            uncertainty,
            top_diseases,
            model_used,
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
                        "mean_probs": mean_probs,
                        "cdss": cdss,
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
    Updated: Accepts full symptoms string, re-runs classifier, returns new diagnosis and next question.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        # Use updated symptoms string (initial + positives)
        symptoms_text = data.get("symptoms", "")
        # Also accept prior diagnosis context to allow fallback when no new symptom text is provided
        prior_disease = data.get("disease")
        prior_confidence = data.get("confidence")
        prior_uncertainty = data.get("uncertainty")
        prior_top_diseases = data.get("top_diseases", []) or []
        asked_questions = data.get("asked_questions", [])
        force_question = data.get("force", False)
        mode = data.get("mode", "adaptive")
        last_answer = data.get("last_answer")
        last_question_id = data.get("last_question_id")
        last_question_text = data.get("last_question_text")

        # Lightweight debug to verify dynamic reclassification input length and asked count
        try:
            print(
                f"[FOLLOW-UP] Reclassify on symptoms len={len(symptoms_text)} | asked={len(asked_questions)}"
            )
        except Exception:
            pass

        # Log last answer that led to this follow-up
        try:
            if last_answer is not None and last_question_id:
                ans = str(last_answer).lower()
                symbol = "✅" if ans == "yes" else ("❌" if ans == "no" else ans)
                print(f"[FOLLOW-UP] Answer: {symbol} to [{last_question_id}]")
                if last_question_text:
                    print(f"[FOLLOW-UP] Question text: {last_question_text}")
        except Exception:
            pass

        # Re-run classifier with updated symptoms whenever we have sufficient evidence.
        # If caller didn't provide enough text, fall back to prior diagnosis context to continue Q&A.
        try:
            too_short = (
                _count_words(symptoms_text) < SYMPTOM_MIN_WORDS
                and len(symptoms_text) < SYMPTOM_MIN_CHARS
            )

            if not too_short:
                (
                    pred,
                    confidence,
                    uncertainty,
                    probs,
                    model_used,
                    top_diseases,
                    mean_probs,
                ) = classifier(symptoms_text)
            else:
                # Fallback path: skip classifier if no new symptom text; use prior context
                print(
                    f"[FOLLOW-UP] Fallback: skipping reclassify (symptoms too short: words={_count_words(symptoms_text)}, chars={len(symptoms_text)})"
                )

                if not prior_disease or not isinstance(prior_top_diseases, list):
                    return (
                        jsonify(
                            {
                                "error": "INSUFFICIENT_SYMPTOM_EVIDENCE",
                                "message": "No new symptom details provided and prior diagnosis context missing. Please resend the cumulative symptoms string or include prior diagnosis fields.",
                                "details": {
                                    "min_words": SYMPTOM_MIN_WORDS,
                                    "min_chars": SYMPTOM_MIN_CHARS,
                                },
                            }
                        ),
                        422,
                    )

                pred = prior_disease
                confidence = (
                    float(prior_confidence) if prior_confidence is not None else 0.0
                )
                uncertainty = (
                    float(prior_uncertainty) if prior_uncertainty is not None else 1.0
                )
                top_diseases = prior_top_diseases
                # Derive simple probs list from provided top_diseases
                try:
                    probs = [
                        f"{d.get('disease')}: {(float(d.get('probability', 0.0))*100):.2f}%"
                        for d in top_diseases
                    ]
                except Exception:
                    probs = []
                model_used = "(skipped reclassify)"
                mean_probs = []
        except Exception as e:
            err = str(e)
            # Map known classifier validation errors to user-friendly HTTP codes
            if "INSUFFICIENT_SYMPTOM_EVIDENCE:" in err:
                reason = err.split("INSUFFICIENT_SYMPTOM_EVIDENCE:")[-1].strip()
                return (
                    jsonify(
                        {
                            "error": "INSUFFICIENT_SYMPTOM_EVIDENCE",
                            "message": "Please add a bit more detail to your symptoms (e.g., duration, severity, other symptoms).",
                            "details": {"reason": reason},
                        }
                    ),
                    422,
                )
            if "UNSUPPORTED_LANGUAGE:" in err:
                lang = err.split("UNSUPPORTED_LANGUAGE:")[-1].strip()
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
            return jsonify({"error": "Classifier error", "details": err}), 500

        # Language detection for question bank
        try:
            if symptoms_text:
                lang_probs = detect_langs(symptoms_text)
                supported_langs = {"en", "tl", "fil"}
                lang = None
                for lang_prob in lang_probs:
                    if lang_prob.lang in supported_langs:
                        lang = lang_prob.lang
                        break
                if lang is None:
                    text_lower = symptoms_text.lower()
                    has_en = any(k in text_lower for k in MEDICAL_KEYWORDS_EN)
                    has_tl = any(k in text_lower for k in MEDICAL_KEYWORDS_TL)
                    if has_tl and not has_en:
                        lang = "tl"
                    else:
                        lang = "en"
            else:
                lang = "en"
        except Exception as e:
            lang = "en"

        QUESTION_BANK = QUESTION_BANK_TL if lang in ["tl", "fil"] else QUESTION_BANK_EN

        # EARLY STOP: Check high confidence FIRST, before any other logic
        # This prevents asking questions when diagnosis is already very confident
        if not force_question and confidence >= 0.95 and uncertainty <= 0.01:
            print(
                f"[FOLLOW-UP] STOP: Very high confidence reached (conf={confidence:.3f}, MI={uncertainty:.4f})"
            )
            return (
                jsonify(
                    {
                        "data": {
                            "should_stop": True,
                            "reason": "HIGH_CONFIDENCE_FINAL",
                            "diagnosis": {
                                "pred": pred,
                                "disease": pred,
                                "confidence": confidence,
                                "uncertainty": uncertainty,
                                "probs": probs,
                                "model_used": model_used,
                                "top_diseases": top_diseases,
                                "mean_probs": mean_probs,
                                "cdss": _build_cdss_payload(
                                    symptoms_text,
                                    pred,
                                    confidence,
                                    uncertainty,
                                    top_diseases,
                                    model_used,
                                ),
                            },
                        }
                    }
                ),
                200,
            )

        # Early stop logic (same as before)
        MAX_QUESTIONS_THRESHOLD = 8
        LOW_CONFIDENCE_THRESHOLD = 0.65
        EXHAUSTED_QUESTIONS_THRESHOLD = 10
        if (
            len(asked_questions) >= MAX_QUESTIONS_THRESHOLD
            and confidence < LOW_CONFIDENCE_THRESHOLD
        ):
            print(
                f"[FOLLOW-UP] STOP: Low confidence after {len(asked_questions)} questions (conf={confidence:.3f}, MI={uncertainty:.4f})"
            )
            return (
                jsonify(
                    {
                        "data": {
                            "should_stop": True,
                            "reason": "LOW_CONFIDENCE_FINAL",
                            "message": "You may not be experiencing a disease that this system can process or your inputs are invalid.",
                            "diagnosis": {
                                "pred": pred,
                                "disease": pred,
                                "confidence": confidence,
                                "uncertainty": uncertainty,
                                "probs": probs,
                                "model_used": model_used,
                                "top_diseases": top_diseases,
                                "mean_probs": mean_probs,
                                "cdss": _build_cdss_payload(
                                    symptoms_text,
                                    pred,
                                    confidence,
                                    uncertainty,
                                    top_diseases,
                                    model_used,
                                ),
                            },
                        }
                    }
                ),
                200,
            )
        if len(asked_questions) >= EXHAUSTED_QUESTIONS_THRESHOLD:
            print(
                f"[FOLLOW-UP] STOP: Exhausted questions for disease={pred} after {len(asked_questions)} asked"
            )
            return (
                jsonify(
                    {
                        "data": {
                            "should_stop": True,
                            "reason": "LOW_CONFIDENCE_FINAL",
                            "message": "You may not be experiencing a disease that this system can process or your inputs are invalid.",
                            "diagnosis": {
                                "pred": pred,
                                "disease": pred,
                                "confidence": confidence,
                                "uncertainty": uncertainty,
                                "probs": probs,
                                "model_used": model_used,
                                "top_diseases": top_diseases,
                                "mean_probs": mean_probs,
                                "cdss": _build_cdss_payload(
                                    symptoms_text,
                                    pred,
                                    confidence,
                                    uncertainty,
                                    top_diseases,
                                    model_used,
                                ),
                            },
                        }
                    }
                ),
                200,
            )

        # If not forced, stop when confidence and uncertainty thresholds are met (secondary check)
        # This catches cases where confidence increased after first follow-up
        if not force_question and confidence >= 0.95 and uncertainty <= 0.01:
            print("[FOLLOW-UP] STOP: High confidence and low uncertainty reached")
            return (
                jsonify(
                    {
                        "data": {
                            "should_stop": True,
                            "reason": "HIGH_CONFIDENCE_FINAL",
                            "diagnosis": {
                                "pred": pred,
                                "disease": pred,
                                "confidence": confidence,
                                "uncertainty": uncertainty,
                                "probs": probs,
                                "model_used": model_used,
                                "top_diseases": top_diseases,
                                "mean_probs": mean_probs,
                                "cdss": _build_cdss_payload(
                                    symptoms_text,
                                    pred,
                                    confidence,
                                    uncertainty,
                                    top_diseases,
                                    model_used,
                                ),
                            },
                        }
                    }
                ),
                200,
            )

        # Question selection logic with duplicate-evidence skipping and coverage
        current_disease = pred
        if current_disease not in QUESTION_BANK:
            print(
                f"[FOLLOW-UP] STOP: No questions available for disease: {current_disease}"
            )
            return (
                jsonify(
                    {"error": f"No questions available for disease: {current_disease}"}
                ),
                400,
            )
        primary_questions = QUESTION_BANK[current_disease]
        symptoms_lower = (symptoms_text or "").lower()

        # Improved evidence detection: check for key symptom keywords, not full phrases
        def has_evidence(q):
            """Check if the question's key symptoms are already mentioned in initial symptoms"""
            qid = q.get("id", "")

            # Map question IDs to key symptom keywords that indicate evidence
            evidence_keywords = {
                # Typhoid (English + Tagalog)
                "typhoid_q1": [
                    "belly pain",
                    "stomach pain",
                    "abdominal pain",
                    "abdomen pain",
                    "stomach ache",
                    "belly ache",
                    "sakit ng tiyan",
                    "pananakit ng tiyan",
                    "masakit ang tiyan",
                    "tiyan",
                    "puson",
                    "sikmura",
                ],
                "typhoid_q2": [
                    "constipation",
                    "diarrhea",
                    "diarrhoea",
                    "loose stool",
                    "watery stool",
                    "alternating",
                    "pagtatae",
                    "pagtitibi",
                    "tibi",
                    "dumi",
                    "tae",
                ],
                "typhoid_q3": [
                    "fever",
                    "high fever",
                    "night fever",
                    "evening fever",
                    "lagnat",
                    "mataas na lagnat",
                    "nilalagnat",
                    "temperatura",
                ],
                "typhoid_q4": [
                    "chills",
                    "shivering",
                    "cold",
                    "shaking",
                    "panginginig",
                    "ginaw",
                    "giniginaw",
                    "nanginginig",
                ],
                "typhoid_q5": [
                    "nausea",
                    "vomit",
                    "vomiting",
                    "feel like vomiting",
                    "urge to vomit",
                    "throwing up",
                    "suka",
                    "nagsusuka",
                    "pagsusuka",
                    "nasusuka",
                    "pagduduwal",
                ],
                "typhoid_q6": [
                    "loss of appetite",
                    "lost appetite",
                    "no appetite",
                    "don't want to eat",
                    "weight loss",
                    "losing weight",
                    "nawalan ng gana",
                    "walang gana",
                    "ayaw kumain",
                ],
                "typhoid_q7": [
                    "fatigue",
                    "tired",
                    "weak",
                    "exhausted",
                    "weakness",
                    "pagod",
                    "napapagod",
                    "mahina",
                    "panghihina",
                    "pagkapagod",
                ],
                "typhoid_q8": [
                    "dehydrated",
                    "dehydration",
                    "trouble staying hydrated",
                    "hard to stay hydrated",
                    "thirsty",
                    "uhaw",
                    "tuyo",
                ],
                "typhoid_q9": [
                    "headache",
                    "head ache",
                    "head pain",
                    "sakit ng ulo",
                    "pananakit ng ulo",
                    "masakit ang ulo",
                ],
                "typhoid_q10": [
                    "trouble sleeping",
                    "can't sleep",
                    "difficulty sleeping",
                    "hard to sleep",
                    "insomnia",
                    "nahihirapan matulog",
                    "hindi makatulog",
                ],
                # Dengue (English + Tagalog)
                "dengue_q1": [
                    "pain",
                    "painful",
                    "discomfort",
                    "ache",
                    "aching",
                    "hurt",
                    "sore",
                    "masakit",
                    "pananakit",
                    "sakit",
                    "kirot",
                ],
                "dengue_q2": [
                    "joint pain",
                    "muscle pain",
                    "body pain",
                    "body ache",
                    "muscle ache",
                    "joint ache",
                    "joints",
                    "muscles",
                    "kalamnan",
                    "buto",
                    "katawan",
                ],
                "dengue_q3": [
                    "fever",
                    "high fever",
                    "temperature",
                    "feverish",
                    "lagnat",
                    "mataas na lagnat",
                    "nilalagnat",
                    "temperatura",
                ],
                "dengue_q4": [
                    "rash",
                    "red spots",
                    "skin rash",
                    "spots",
                    "skin eruption",
                    "pantal",
                    "pula",
                    "pulang spot",
                ],
                "dengue_q5": [
                    "redness",
                    "red skin",
                    "inflamed",
                    "inflammation",
                    "swelling",
                    "pula",
                    "namumula",
                    "pamumula",
                    "pamamaga",
                ],
                "dengue_q6": [
                    "eye pain",
                    "pain behind eyes",
                    "retro-orbital",
                    "eyes hurt",
                    "mata",
                    "pananakit ng mata",
                    "likod ng mata",
                    "masakit ang mata",
                ],
                "dengue_q7": [
                    "chills",
                    "shivering",
                    "cold",
                    "freezing",
                    "shaking",
                    "panginginig",
                    "ginaw",
                    "giniginaw",
                    "nanginginig",
                ],
                "dengue_q8": [
                    "nausea",
                    "vomit",
                    "vomiting",
                    "feel like vomiting",
                    "urge to vomit",
                    "throwing up",
                    "suka",
                    "nagsusuka",
                    "pagsusuka",
                    "nasusuka",
                    "pagduduwal",
                ],
                "dengue_q9": [
                    "fatigue",
                    "tired",
                    "weak",
                    "exhausted",
                    "weakness",
                    "pagod",
                    "napapagod",
                    "mahina",
                    "panghihina",
                ],
                "dengue_q10": [
                    "headache",
                    "head ache",
                    "head pain",
                    "sakit ng ulo",
                    "pananakit ng ulo",
                    "masakit ang ulo",
                ],
                # Pneumonia (English + Tagalog)
                "pneumonia_q1": [
                    "mucus",
                    "phlegm",
                    "sputum",
                    "thick",
                    "coughing up",
                    "plema",
                    "sipon",
                ],
                "pneumonia_q2": [
                    "sweat",
                    "sweating",
                    "perspiration",
                    "heavy sweating",
                    "pawis",
                    "pinagpapawisan",
                    "pagpapawis",
                ],
                "pneumonia_q3": [
                    "chest pain",
                    "pain when breathing",
                    "pain when coughing",
                    "chest hurt",
                    "chest discomfort",
                    "dibdib",
                    "pananakit ng dibdib",
                    "masakit ang dibdib",
                    "sakit ng dibdib",
                ],
                "pneumonia_q4": [
                    "pain",
                    "painful",
                    "body pain",
                    "ache",
                    "masakit",
                    "pananakit",
                    "sakit",
                ],
                "pneumonia_q5": [
                    "fatigue",
                    "tired",
                    "weak",
                    "exhausted",
                    "weakness",
                    "pagod",
                    "napapagod",
                    "mahina",
                    "panghihina",
                ],
                "pneumonia_q6": [
                    "chills",
                    "cold",
                    "shivering",
                    "shaking",
                    "panginginig",
                    "ginaw",
                    "giniginaw",
                    "nanginginig",
                ],
                "pneumonia_q7": [
                    "cough",
                    "coughing",
                    "persistent cough",
                    "ubo",
                    "umuubo",
                    "inuubo",
                ],
                "pneumonia_q8": [
                    "fever",
                    "high fever",
                    "temperature",
                    "lagnat",
                    "mataas na lagnat",
                    "nilalagnat",
                ],
                "pneumonia_q9": [
                    "shortness of breath",
                    "difficulty breathing",
                    "rapid breathing",
                    "hard to breathe",
                    "breathless",
                    "breathing",
                    "breath",
                    "hininga",
                    "hinga",
                    "paghinga",
                    "hirap huminga",
                    "nahihirapan huminga",
                ],
                "pneumonia_q10": [
                    "joint pain",
                    "muscle pain",
                    "joints",
                    "muscles",
                    "kalamnan",
                    "buto",
                ],
                # Impetigo (English + Tagalog)
                "impetigo_q1": [
                    "face",
                    "nose",
                    "mouth",
                    "lip",
                    "lips",
                    "chin",
                    "mukha",
                    "ilong",
                    "bibig",
                    "labi",
                ],
                "impetigo_q2": [
                    "sore",
                    "sores",
                    "lesion",
                    "lesions",
                    "wound",
                    "wounds",
                    "sugat",
                ],
                "impetigo_q3": [
                    "oozing",
                    "discharge",
                    "fluid",
                    "liquid",
                    "pus",
                    "weeping",
                    "nana",
                    "likido",
                ],
                "impetigo_q4": [
                    "rash",
                    "eruption",
                    "skin eruption",
                    "pantal",
                ],
                "impetigo_q5": [
                    "pain",
                    "painful",
                    "tender",
                    "discomfort",
                    "hurt",
                    "masakit",
                    "pananakit",
                    "sakit",
                ],
                "impetigo_q6": [
                    "red",
                    "redness",
                    "inflamed",
                    "inflammation",
                    "swelling",
                    "pula",
                    "namumula",
                    "pamumula",
                    "pamamaga",
                ],
                "impetigo_q7": [
                    "blister",
                    "blisters",
                    "pustule",
                    "pustules",
                    "paltos",
                ],
                "impetigo_q8": [
                    "fever",
                    "temperature",
                    "lagnat",
                    "mataas na lagnat",
                    "nilalagnat",
                ],
                "impetigo_q9": [
                    "itching",
                    "itchy",
                    "irritation",
                    "itch",
                    "kati",
                    "makati",
                    "pangangati",
                ],
                "impetigo_q10": [
                    "joint pain",
                    "muscle pain",
                    "joints",
                    "muscles",
                    "kalamnan",
                    "buto",
                ],
            }

            keywords = evidence_keywords.get(qid, [])
            if not keywords:
                return False

            # Check if ANY of the keywords are present in symptoms
            return any(kw in symptoms_lower for kw in keywords)

        duplicate_ids = [q["id"] for q in primary_questions if has_evidence(q)]
        available_questions = [
            q
            for q in primary_questions
            if q["id"] not in asked_questions and q["id"] not in duplicate_ids
        ]

        if duplicate_ids:
            try:
                print(
                    f"[FOLLOW-UP] Skipping {len(duplicate_ids)} duplicate question(s) already evidenced in symptoms: {', '.join(duplicate_ids)}"
                )
            except Exception:
                pass

        if not available_questions:
            print(
                f"[FOLLOW-UP] STOP: All questions asked for disease: {current_disease}"
            )
            return (
                jsonify(
                    {
                        "data": {
                            "should_stop": True,
                            "reason": "LOW_CONFIDENCE_FINAL",
                            "message": "You may not be experiencing a disease that this system can process or your inputs are invalid.",
                            "diagnosis": {
                                "pred": pred,
                                "disease": pred,
                                "confidence": confidence,
                                "uncertainty": uncertainty,
                                "probs": probs,
                                "model_used": model_used,
                                "top_diseases": top_diseases,
                                "mean_probs": mean_probs,
                                "cdss": _build_cdss_payload(
                                    symptoms_text,
                                    pred,
                                    confidence,
                                    uncertainty,
                                    top_diseases,
                                    model_used,
                                ),
                            },
                        }
                    }
                ),
                200,
            )

        # Compute primary coverage (how many primary questions are already evidenced)
        primary_only = [
            q
            for q in primary_questions
            if (q.get("category") or "").lower() == "primary"
        ]
        coverage_primary = sum(1 for q in primary_only if has_evidence(q))

        # Evidence-based early stop
        if coverage_primary >= 3 and (confidence >= 0.78 and uncertainty <= 0.04):
            print(
                f"[FOLLOW-UP] STOP: Sufficient evidence reached (coverage_primary={coverage_primary}, conf={confidence:.3f}, MI={uncertainty:.4f})"
            )
            return (
                jsonify(
                    {
                        "data": {
                            "should_stop": True,
                            "reason": "LOW_CONFIDENCE_FINAL",
                            "message": "You may not be experiencing a disease that this system can process or your inputs are invalid.",
                            "diagnosis": {
                                "pred": pred,
                                "disease": pred,
                                "confidence": confidence,
                                "uncertainty": uncertainty,
                                "probs": probs,
                                "model_used": model_used,
                                "top_diseases": top_diseases,
                                "mean_probs": mean_probs,
                                "cdss": _build_cdss_payload(
                                    symptoms_text,
                                    pred,
                                    confidence,
                                    uncertainty,
                                    top_diseases,
                                    model_used,
                                ),
                            },
                        }
                    }
                ),
                200,
            )

        # Discrimination logic (prefer when probs close OR coverage strong)
        selected_question = None
        if mode != "legacy" and len(top_diseases) >= 2:
            second_disease = top_diseases[1]["disease"]
            prob_diff = abs(
                top_diseases[0]["probability"] - top_diseases[1]["probability"]
            )
            if (
                prob_diff < 0.2 or coverage_primary >= 2
            ) and second_disease in QUESTION_BANK:
                secondary_questions = QUESTION_BANK[second_disease]
                secondary_question_texts = {q["question"] for q in secondary_questions}
                discriminating_questions = [
                    q
                    for q in available_questions
                    if q["question"] not in secondary_question_texts
                ]
                if discriminating_questions:
                    selected_question = max(
                        discriminating_questions, key=lambda q: q["weight"]
                    )
        if not selected_question:
            selected_question = max(
                available_questions,
                key=lambda q: (q["category"] == "primary", q["weight"]),
            )

        # Summary log for current decision state and the next question selected
        try:
            print(
                f"[FOLLOW-UP] {pred} | Lang: {lang} | Conf: {confidence:.3f} | MI: {uncertainty:.4f} | Asked: {len(asked_questions)}"
            )
            if len(top_diseases) >= 2:
                td0, td1 = top_diseases[0], top_diseases[1]
                print(
                    f"[FOLLOW-UP] Top 2: {td0['disease']} ({td0['probability']:.3f}), {td1['disease']} ({td1['probability']:.3f})"
                )
            print(
                f"[FOLLOW-UP] Next question -> {selected_question['id']}: {selected_question['question']} (cat: {selected_question.get('category', '')})"
            )
        except Exception:
            pass

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
                        "diagnosis": {
                            "pred": pred,
                            "disease": pred,
                            "confidence": confidence,
                            "uncertainty": uncertainty,
                            "probs": probs,
                            "model_used": model_used,
                            "top_diseases": top_diseases,
                            "mean_probs": mean_probs,
                            "cdss": _build_cdss_payload(
                                symptoms_text,
                                pred,
                                confidence,
                                uncertainty,
                                top_diseases,
                                model_used,
                            ),
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


@app.route("/diagnosis/explain", methods=["POST"])
def explain_diagnosis():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        text = data.get("symptoms", "")
        if not text:
            return jsonify({"error": "Symptoms cannot be empty"}), 400

        mean_probs = data.get("mean_probs", None)
        if mean_probs is None:
            return jsonify({"error": "mean_probs is required"}), 400

        # Get model explanations (explainer returns a plain serializable dict)
        result = explainer(text, mean_probs)

        # Return the real symptoms and tokens from the explainer result
        return (
            jsonify(
                {"symptoms": result.get("symptoms"), "tokens": result.get("tokens")}
            ),
            200,
        )

    except Exception as e:
        error_msg = str(e)
        error_details = traceback.format_exc()
        return (
            jsonify(
                {
                    "error": "EXPLANATION_ERROR",
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


# --- K-means clustering endpoint ---
from kmeans_cluster import fetch_patient_data, run_kmeans, get_cluster_statistics


@app.route("/api/patient-clusters", methods=["GET"])
def patient_clusters():
    try:
        # You may want to allow n_clusters as a query param
        # Default to 4 clusters to align with 4 primary diseases
        n_clusters = int(request.args.get("n_clusters", 4))

        # Fetch data from PostgreSQL using DATABASE_URL
        data, patient_info = fetch_patient_data()

        if data.size == 0:
            return jsonify({"error": "No patient data available"}), 404

        # Run K-means clustering
        clusters, centers = run_kmeans(data, n_clusters=n_clusters)

        # Get cluster statistics
        cluster_stats = get_cluster_statistics(patient_info, clusters, n_clusters)

        # Add cluster assignment to each patient
        for i, patient in enumerate(patient_info):
            patient["cluster"] = int(clusters[i])

        print(
            f"[KMEANS] Clustered {len(patient_info)} patients into {n_clusters} clusters"
        )
        for stat in cluster_stats:
            print(
                f"[KMEANS] Cluster {stat['cluster_id']}: {stat['count']} patients, avg age {stat['avg_age']}"
            )

        return jsonify(
            {
                "n_clusters": n_clusters,
                "total_patients": len(patient_info),
                "cluster_statistics": cluster_stats,
                "patients": patient_info,
                "centers": centers.tolist(),
            }
        )
    except Exception as e:
        import traceback

        error_details = traceback.format_exc()
        print(f"ERROR in patient_clusters: {str(e)}")
        print(error_details)
        return jsonify({"error": str(e), "details": error_details}), 500


@app.route("/api/patient-clusters/silhouette", methods=["GET"])
def patient_clusters_silhouette():
    """Evaluate KMeans clustering quality across a range of k using silhouette score.
    Query params:
      - range: e.g. "3-10" or "4" (defaults to 3-10)
    Returns JSON with best k and per-k metrics (silhouette, inertia, cluster sizes).
    """
    try:
        # Parse k range
        range_param = request.args.get("range", "3-10")
        try:
            parts = [int(p) for p in range_param.split("-") if p.strip()]
            if len(parts) == 1:
                k_min = k_max = parts[0]
            else:
                k_min, k_max = parts[0], parts[1]
        except Exception:
            k_min, k_max = 3, 10

        # Fetch encoded data
        data, _ = fetch_patient_data()
        n_samples = len(data)
        if n_samples < 3:
            return (
                jsonify(
                    {
                        "error": "Not enough samples for silhouette (need >= 3)",
                        "n_samples": n_samples,
                    }
                ),
                400,
            )

        from sklearn.cluster import KMeans
        from sklearn.metrics import silhouette_score
        from collections import Counter

        results = []
        for k in range(k_min, k_max + 1):
            # Valid k range for silhouette: 2 <= k < n_samples
            if k < 2 or k >= n_samples:
                continue
            try:
                model = KMeans(n_clusters=k, random_state=42, n_init=10)
                labels = model.fit_predict(data)
                score = float(silhouette_score(data, labels))
                counts = Counter(labels.tolist())
                results.append(
                    {
                        "k": k,
                        "silhouette": round(score, 4),
                        "inertia": float(model.inertia_),
                        "cluster_sizes": dict(counts),
                    }
                )
            except Exception as e:
                # Skip problematic k
                results.append({"k": k, "error": str(e)})

        # Sort by silhouette desc, filter only entries with silhouette
        scored = [r for r in results if "silhouette" in r]
        best = None
        if scored:
            best = sorted(scored, key=lambda x: x["silhouette"], reverse=True)[0]

        return jsonify(
            {
                "n_samples": n_samples,
                "range": [k_min, k_max],
                "best": best,
                "results": results,
            }
        )
    except Exception as e:
        import traceback

        error_details = traceback.format_exc()
        return jsonify({"error": str(e), "details": error_details}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 10000))
    # Enable debug autoreload by default in local dev. Override via FLASK_DEBUG=0 to disable.
    debug_env = os.getenv("FLASK_DEBUG", "1").strip().lower()
    debug_mode = debug_env in ("1", "true", "yes", "on")
    app.run(debug=debug_mode, use_reloader=debug_mode, host="0.0.0.0", port=port)
