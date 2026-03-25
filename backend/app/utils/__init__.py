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
        if token in [
            "[CLS]",
            "[SEP]",
            "[PAD]",
            "<s>",
            "</s>",
            "<pad>",
            "<cls>",
            "<sep>",
        ]:
            continue

        # BPE and SentencePiece word-start markers
        if token.startswith("Ġ") or token.startswith(" "):
            if current_tokens or current_word:
                if tokenizer is not None:
                    ids = tokenizer.convert_tokens_to_ids(current_tokens)
                    words.append(
                        tokenizer.decode(
                            ids, clean_up_tokenization_spaces=False
                        ).strip()
                    )
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
            if (tokenizer is None and current_word and current_word.endswith(" ")) or (
                tokenizer is not None
                and current_tokens
                and current_tokens[-1].endswith(" ")
            ):
                if tokenizer is not None:
                    ids = tokenizer.convert_tokens_to_ids(current_tokens)
                    words.append(
                        tokenizer.decode(
                            ids, clean_up_tokenization_spaces=False
                        ).strip()
                    )
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
            words.append(
                tokenizer.decode(ids, clean_up_tokenization_spaces=False).strip()
            )
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
    has_en_keyword = any(
        keyword in text_lower for keyword in config.MEDICAL_KEYWORDS_EN
    )
    has_tl_keyword = any(
        keyword in text_lower for keyword in config.MEDICAL_KEYWORDS_TL
    )

    return has_en_keyword or has_tl_keyword


def _build_cdss_payload(
    symptoms: str,
    disease: str,
    confidence: float,
    uncertainty: float,
    top_diseases: list,
    model_used: str,
) -> dict:
    """Construct a structured CDSS payload to accompany narrative output.

    Triage determination uses a 3-tier risk stratification system based on
    ML model confidence and uncertainty thresholds from config. Thresholds are
    thesis-backed: ECE calibration (0.084), sensitivity analysis, ROC/PR optimization.
    
    3-Tier System:
    - LOW PRIORITY (Green): Confidence >= 90% AND uncertainty <= 3% → Automated diagnosis
    - MEDIUM PRIORITY (Yellow): Confidence 70-90% OR uncertainty 3-8% → Nurse review
    - HIGH PRIORITY (Red): Confidence < 70% OR uncertainty > 8% → Physician review
    
    No keyword-based escalation is performed, as CDSS should not autonomously label
    symptoms as emergent without clinician review.
    """
    # 3-Tier triage determination based on confidence and uncertainty
    if (
        confidence >= config.TRIAGE_HIGH_CONFIDENCE
        and uncertainty <= config.TRIAGE_LOW_UNCERTAINTY
    ):
        # LOW PRIORITY (Green): High confidence, low uncertainty
        triage_level = "Low Priority"
        triage_reasons = [
            f"High model confidence (≥ {config.TRIAGE_HIGH_CONFIDENCE:.0%})",
            f"Low uncertainty (≤ {config.TRIAGE_LOW_UNCERTAINTY:.0%})",
            "Safe for automated diagnosis without human review",
        ]
        care_setting = "Home care or routine clinic visit"
        actions = [
            "Home care guidance and symptom monitoring",
            "Schedule routine clinic follow-up if symptoms persist or worsen",
            "Return immediately if warning signs develop",
        ]
    elif (
        confidence >= config.TRIAGE_MEDIUM_CONFIDENCE_MIN
        and uncertainty <= config.TRIAGE_MEDIUM_UNCERTAINTY_MAX
    ):
        # MEDIUM PRIORITY (Yellow): Moderate confidence or uncertainty
        triage_level = "Medium Priority"
        triage_reasons = [
            f"Moderate model confidence ({config.TRIAGE_MEDIUM_CONFIDENCE_MIN:.0%}–{config.TRIAGE_HIGH_CONFIDENCE:.0%})",
            f"Moderate uncertainty level ({config.TRIAGE_LOW_UNCERTAINTY:.0%}–{config.TRIAGE_MEDIUM_UNCERTAINTY_MAX:.0%})",
            "Requires clinical validation for safety",
        ]
        care_setting = "Clinic visit within 24 hours"
        actions = [
            "Consult a healthcare professional within 24 hours",
            "Nurse assessment recommended for initial evaluation",
            "Provide additional history, vitals, and physical exam",
            "Monitor for symptom progression or warning signs",
        ]
    else:
        # HIGH PRIORITY (Red): Low confidence or high uncertainty
        triage_level = "High Priority"
        triage_reasons = [
            f"Low model confidence (< {config.TRIAGE_MEDIUM_CONFIDENCE_MIN:.0%})" if confidence < config.TRIAGE_MEDIUM_CONFIDENCE_MIN else f"High uncertainty (> {config.TRIAGE_MEDIUM_UNCERTAINTY_MAX:.0%})",
            "Model prediction requires expert clinical review",
            "Additional diagnostic workup recommended",
        ]
        care_setting = "Prompt physician evaluation required"
        actions = [
            "Consult a healthcare professional promptly",
            "Physician evaluation required for clinical decision-making",
            "Consider additional diagnostic tests (labs, imaging) as clinically indicated",
            "Provide comprehensive history, vitals, and physical examination",
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

    # Disease-specific knowledge references from authoritative sources
    _KNOWLEDGE_BY_DISEASE = {
        "Dengue": [
            {
                "topic": "Dengue overview, symptoms and warning signs",
                "source": "WHO",
                "link": "https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue",
            },
            {
                "topic": "Dengue prevention and mosquito control",
                "source": "CDC",
                "link": "https://www.cdc.gov/dengue/index.html",
            },
        ],
        "Diarrhea": [
            {
                "topic": "Diarrhoeal disease overview and treatment",
                "source": "WHO",
                "link": "https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease",
            },
            {
                "topic": "Diarrhea prevention and oral rehydration",
                "source": "CDC",
                "link": "https://www.cdc.gov/diarrhea/index.html",
            },
        ],
        "Influenza": [
            {
                "topic": "Seasonal influenza overview and vaccination",
                "source": "WHO",
                "link": "https://www.who.int/news-room/fact-sheets/detail/influenza-(seasonal)",
            },
            {
                "topic": "Flu symptoms, treatment and prevention",
                "source": "CDC",
                "link": "https://www.cdc.gov/flu/index.html",
            },
        ],
        "Measles": [
            {
                "topic": "Measles overview, symptoms and complications",
                "source": "WHO",
                "link": "https://www.who.int/news-room/fact-sheets/detail/measles",
            },
            {
                "topic": "Measles signs, vaccination and prevention",
                "source": "CDC",
                "link": "https://www.cdc.gov/measles/index.html",
            },
        ],
        "Pneumonia": [
            {
                "topic": "Pneumonia causes, prevention and treatment",
                "source": "WHO",
                "link": "https://www.who.int/news-room/fact-sheets/detail/pneumonia",
            },
            {
                "topic": "Pneumonia symptoms and risk factors",
                "source": "CDC",
                "link": "https://www.cdc.gov/pneumonia/index.html",
            },
        ],
        "Typhoid": [
            {
                "topic": "Typhoid fever overview and vaccination",
                "source": "WHO",
                "link": "https://www.who.int/news-room/fact-sheets/detail/typhoid",
            },
            {
                "topic": "Typhoid fever symptoms, treatment and prevention",
                "source": "CDC",
                "link": "https://www.cdc.gov/typhoid-fever/index.html",
            },
        ],
    }

    knowledge = _KNOWLEDGE_BY_DISEASE.get(
        disease,
        [
            {
                "topic": "General health information",
                "source": "WHO",
                "link": "https://www.who.int/health-topics",
            },
        ],
    )

    payload = {
        "differential": differential,
        "triage": {
            "level": triage_level,
            "reasons": triage_reasons,
        },
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
                config.ENG_MODEL_PATH
                if "ModernBERT" in model_used
                else config.FIL_MODEL_PATH
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
            print(
                f"[DEBUG] Heuristic: TL matches ({tl_matches}) >= EN matches ({en_matches}), forcing TL"
            )
        return "tl"

    if debug:
        print(
            f"[DEBUG] Heuristic: EN matches ({en_matches}) > TL matches ({tl_matches}) or no TL matches, forcing EN"
        )
    return "en"
