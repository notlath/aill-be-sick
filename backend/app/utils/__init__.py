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


def extract_all_symptom_qids(
    symptoms_text: str, question_answers: dict, evidence_keywords: dict
) -> list[str]:
    """
    Extracts all symptom question IDs that are matched in the initial symptoms text
    or were answered with "yes" in follow-up questions.
    """
    matched = set()
    symptoms_lower = symptoms_text.lower()

    # 1. Add matches from initial text keywords
    for qid, keywords in evidence_keywords.items():
        if any(kw.lower() in symptoms_lower for kw in keywords):
            matched.add(qid)

    # 2. Add explicitly answered "yes" questions
    for qid, ans in question_answers.items():
        if str(ans).lower() == "yes":
            matched.add(qid)

    return list(matched)


def _build_cdss_payload(
    symptoms: str,
    disease: str,
    confidence: float,
    uncertainty: float,
    top_diseases: list,
    model_used: str,
    is_valid: bool = True,
    question_answers: dict | None = None,
) -> dict:
    from app.question_groups import (
        detect_symptom_groups_in_text,
        get_warning_sign_groups,
        get_groups_for_question,
    )
    import app.config as config

    # 1. Gather all detected symptom groups (from text and questions)
    detected_groups = detect_symptom_groups_in_text(symptoms)
    if question_answers:
        for qid, ans in question_answers.items():
            if str(ans).lower() == "yes":
                detected_groups.update(get_groups_for_question(qid))
                
    warning_signs = get_warning_sign_groups(detected_groups)
    has_warning_signs = len(warning_signs) > 0

    # 2. Determine base metrics-driven triage
    is_uncertain = not is_valid or confidence < config.TRIAGE_MEDIUM_CONFIDENCE_MIN
    
    if confidence >= config.TRIAGE_HIGH_CONFIDENCE and uncertainty <= config.TRIAGE_LOW_UNCERTAINTY:
        base_level = "Low Priority"
    elif confidence >= config.TRIAGE_MEDIUM_CONFIDENCE_MIN and uncertainty <= config.TRIAGE_MEDIUM_UNCERTAINTY_MAX:
        base_level = "Medium Priority"
    else:
        base_level = "High Priority"

    # 3. Determine Disease-Specific Floor
    disease_floor = "Low Priority"
    if disease in ["Dengue", "Typhoid", "Pneumonia", "Measles"]:
        disease_floor = "Medium Priority"

    # 4. Resolve Final Triage Level
    priority_rank = {"Low Priority": 1, "Medium Priority": 2, "High Priority": 3}
    
    final_level = base_level
    if priority_rank[disease_floor] > priority_rank[final_level]:
        final_level = disease_floor
    if has_warning_signs:
        final_level = "High Priority"
        
    triage_level = final_level
    
    # 5. Build Reasons and Actions based on final level
    triage_reasons = []
    actions = []
    care_setting = ""
    
    if triage_level == "Low Priority":
        triage_reasons = [
            f"High model confidence (≥ {config.TRIAGE_HIGH_CONFIDENCE:.0%})",
            f"Low uncertainty (≤ {config.TRIAGE_LOW_UNCERTAINTY:.0%})",
            "No severe warning signs detected",
            "Safe for automated diagnosis without human review",
        ]
        care_setting = "Home care or routine clinic visit"
        actions = [
            "Home care guidance and symptom monitoring",
            "Schedule routine clinic follow-up if symptoms persist or worsen",
            "Return immediately if warning signs develop",
        ]
    elif triage_level == "Medium Priority":
        if base_level == "Low Priority":
            # Escalated strictly due to disease floor
            triage_reasons.append("Clinical baseline protocol requires medical evaluation")
        else:
            triage_reasons.extend([
                f"Moderate model confidence ({config.TRIAGE_MEDIUM_CONFIDENCE_MIN:.0%}–{config.TRIAGE_HIGH_CONFIDENCE:.0%})",
                f"Moderate uncertainty level ({config.TRIAGE_LOW_UNCERTAINTY:.0%}–{config.TRIAGE_MEDIUM_UNCERTAINTY_MAX:.0%})",
                "Requires clinical validation for safety",
            ])
            
        care_setting = "Clinic visit within 24 hours"
        actions = [
            "Consult a healthcare professional within 24 hours",
            "Nurse assessment recommended for initial evaluation",
            "Provide additional history, vitals, and physical exam",
            "Monitor for symptom progression or warning signs",
        ]
    else:  # High Priority
        if has_warning_signs:
            triage_reasons.append("Severe warning signs detected (requires immediate clinical assessment)")
        
        if is_uncertain:
            triage_reasons.extend([
                "Unable to reach confident diagnosis from symptoms provided",
                "Clinical evaluation needed for proper assessment",
                "Additional diagnostic workup may be required",
            ])
        elif base_level == "High Priority":
            triage_reasons.extend([
                f"Low model confidence (< {config.TRIAGE_MEDIUM_CONFIDENCE_MIN:.0%})" if confidence < config.TRIAGE_MEDIUM_CONFIDENCE_MIN else f"High uncertainty (> {config.TRIAGE_MEDIUM_UNCERTAINTY_MAX:.0%})",
                "Model prediction requires expert clinical review",
                "Additional diagnostic workup recommended",
            ])
            
        care_setting = "Prompt physician evaluation required"
        actions = [
            "Consult a healthcare professional promptly",
            "Physician evaluation required for clinical decision-making",
            "Consider additional diagnostic tests (labs, imaging) as clinically indicated",
            "Provide comprehensive history, vitals, and physical examination",
        ]

    # 6. Append Disease-Specific Reasons and Actions
    if disease == "Dengue":
        if priority_rank[triage_level] >= 2 and base_level == "Low Priority" and not has_warning_signs:
            triage_reasons.append("Suspected Dengue requires an initial laboratory test (CBC) and medical monitoring.")
        actions.insert(0, "Get a Complete Blood Count (CBC) as soon as possible.")
        actions.insert(0, "Do not take ibuprofen or aspirin (NSAIDs) as they increase bleeding risk. Take paracetamol for fever.")
    elif disease in ["Typhoid", "Pneumonia"]:
        if priority_rank[triage_level] >= 2 and base_level == "Low Priority" and not has_warning_signs:
            triage_reasons.append("Requires clinical evaluation for appropriate prescription antibiotics.")
    elif disease == "Measles":
        if priority_rank[triage_level] >= 2 and base_level == "Low Priority" and not has_warning_signs:
            triage_reasons.append("Requires clinical evaluation for Vitamin A supplementation and isolation protocols.")
        actions.insert(0, "Isolate immediately to prevent spreading the virus.")
    elif disease == "Diarrhea":
        actions.insert(0, "Begin drinking Oral Rehydration Salts (ORS) immediately to replace lost fluids.")

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

    from app.evidence_keywords import EVIDENCE_KEYWORDS

    # Try to grab question_answers from Flask session if not provided, for backwards compat
    if question_answers is None:
        try:
            from flask import session

            sess = session.get("diagnosis", {})
            question_answers = sess.get("question_answers", {})
        except Exception:
            question_answers = {}

    extracted_symptoms = extract_all_symptom_qids(
        symptoms, question_answers or {}, EVIDENCE_KEYWORDS
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
        "extracted_symptoms": extracted_symptoms,
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
