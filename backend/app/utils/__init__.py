
import re
import html
import unicodedata
import numpy as np
import app.config as config
from flask import jsonify

__all__ = [
    "_count_words",
    "clean_token",
    "aggregate_subword_attributions",
    "_has_medical_keywords",
    "_detect_red_flags",
    "_build_cdss_payload",
    "detect_language_heuristic",
]

def _count_words(text: str) -> int:
    return len([w for w in (text or "").strip().split() if w])

def clean_token(t):
    # Decode weird UTF-8 artifacts and normalize apostrophes
    t = t.encode("utf-8", "ignore").decode("utf-8", "ignore")
    t = t.replace("âĢĻ", "'").replace("â€™", "'").replace("’", "'").replace("‘", "'")
    t = html.unescape(t)  # decode HTML entities like &amp;
    t = unicodedata.normalize("NFKC", t)
    return t.strip()

def aggregate_subword_attributions(tokens, attributions, tokenizer=None):
    """
    Merge subword tokens (e.g., Ġirrit + ating -> 'irritating')
    and sum their attributions to produce word-level importance.
    Works for both BPE (Ġ) and WordPiece (##) style tokenizers.
    """
    words = []
    word_attrs = []
    
    current_tokens = []
    current_word = ""
    current_attr = 0.0

    for token, attr in zip(tokens, attributions):
        if token in ["[CLS]", "[SEP]", "[PAD]", "<s>", "</s>", "<pad>", "<cls>", "<sep>"]:
            continue

        # BPE and SentencePiece word-start markers
        if token.startswith("Ġ") or token.startswith(" "):
            if current_tokens or current_word:
                if tokenizer is not None:
                    ids = tokenizer.convert_tokens_to_ids(current_tokens)
                    words.append(tokenizer.decode(ids, clean_up_tokenization_spaces=False).strip())
                else:
                    words.append(current_word.strip())
                word_attrs.append(current_attr)
            
            if tokenizer is not None:
                current_tokens = [token]
            else:
                current_word = token.replace("Ġ", " ").replace(" ", " ")
            current_attr = attr

        elif token.startswith("##"):
            if tokenizer is not None:
                current_tokens.append(token)
            else:
                current_word += token[2:]
            current_attr += attr

        else:
            if (tokenizer is None and current_word and current_word.endswith(" ")) or \
               (tokenizer is not None and current_tokens and current_tokens[-1].endswith(" ")):
                if tokenizer is not None:
                    ids = tokenizer.convert_tokens_to_ids(current_tokens)
                    words.append(tokenizer.decode(ids, clean_up_tokenization_spaces=False).strip())
                else:
                    words.append(current_word.strip())
                word_attrs.append(current_attr)
                
                if tokenizer is not None:
                    current_tokens = [token]
                else:
                    current_word = token
                current_attr = attr
            else:
                if tokenizer is not None:
                    current_tokens.append(token)
                else:
                    current_word += token
                current_attr += attr

    if current_tokens or current_word:
        if tokenizer is not None:
            ids = tokenizer.convert_tokens_to_ids(current_tokens)
            words.append(tokenizer.decode(ids, clean_up_tokenization_spaces=False).strip())
        else:
            words.append(current_word.strip())
        word_attrs.append(current_attr)

    return words, np.array(word_attrs)

def _has_medical_keywords(text: str, lang: str = "en") -> bool:
    """
    Check if text contains at least one medical/health-related keyword.
    Returns True if medical keyword found, False otherwise.

    Note: Checks BOTH English and Tagalog keywords regardless of detected language
    because langdetect can misidentify Tagalog as Indonesian/Slovenian/etc.
    """
    text_lower = text.lower()

    # Check both language sets to handle langdetect misidentifications
    has_en_keyword = any(keyword in text_lower for keyword in config.MEDICAL_KEYWORDS_EN)
    has_tl_keyword = any(keyword in text_lower for keyword in config.MEDICAL_KEYWORDS_TL)

    return has_en_keyword or has_tl_keyword

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
        if confidence >= config.TRIAGE_HIGH_CONFIDENCE and uncertainty <= config.TRIAGE_LOW_UNCERTAINTY:
            triage_level = "Non-urgent"
            triage_reasons = [
                f"High model confidence (≥ {config.TRIAGE_HIGH_CONFIDENCE})",
                f"Low uncertainty (≤ {config.TRIAGE_LOW_UNCERTAINTY})",
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
                config.ENG_MODEL_PATH if "ModernBERT" in model_used else config.FIL_MODEL_PATH
            ),
            "thresholds": {
                "hard_min_conf": config.SYMPTOM_MIN_CONF,
                "soft_min_conf": config.SYMPTOM_SOFT_MIN_CONF,
                "hard_max_mi": config.SYMPTOM_MAX_MI,
                "soft_max_mi": config.SYMPTOM_SOFT_MAX_MI,
            },
        },
    }

    return payload

def detect_language_heuristic(text, debug=False):
    """
    Deterministic Language Detection Heuristic.
    """
    # Quick fallback for empty text
    if not text or not text.strip():
        return "en"

    # NOTE: In the original app.py, this function tried to use classifiers that might not be initialized
    # or had a recursive dependency.
    # We will simplify this to pure keyword matching + length heuristic if we can't access tokenizers easily
    # OR we need to accept tokenizers as arguments.
    # Ideally, we pass tokenizers IN, but for now let's rely on keywords which are strong indicators.
    
    # Keyword-based detection (Count based instead of boolean fallback)
    text_lower = text.lower()
    
    tl_matches = sum(1 for k in config.MEDICAL_KEYWORDS_TL if k in text_lower)
    en_matches = sum(1 for k in config.MEDICAL_KEYWORDS_EN if k in text_lower)

    if tl_matches > 0 and tl_matches >= en_matches:
        if debug:
            print(f"[DEBUG] Heuristic: TL matches ({tl_matches}) >= EN matches ({en_matches}), forcing TL")
        return "tl"
    
    if debug:
        print(f"[DEBUG] Heuristic: EN matches ({en_matches}) > TL matches ({tl_matches}) or no TL matches, forcing EN")
    return "en"
