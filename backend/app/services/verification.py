import re
import app.config as config
from typing import Dict, Set, List, Optional
from rapidfuzz import fuzz


def _get_fuzzy_threshold(term: str) -> int:
    """Return the similarity threshold based on term length."""
    length = len(term)
    if length <= 5:
        return config.FUZZY_THRESHOLD_SHORT
    elif length <= 9:
        return config.FUZZY_THRESHOLD_MEDIUM
    else:
        return config.FUZZY_THRESHOLD_LONG


def _fuzzy_match_term(term: str, text: str) -> bool:
    """
    Check if a dictionary term fuzzy-matches anywhere in the text using a
    sliding window of n-grams. The window size equals the term length (in words)
    so we compare apples-to-apples.
    """
    if len(term) < config.FUZZY_MIN_TERM_LENGTH:
        return False

    threshold = _get_fuzzy_threshold(term)
    term_word_count = len(term.split())

    # Split text into words and generate n-grams matching the term's word count
    words = text.split()
    if len(words) < term_word_count:
        return False

    import string

    for i in range(len(words) - term_word_count + 1):
        window = " ".join(words[i : i + term_word_count])
        # Strip punctuation from window string, except spaces
        window = window.translate(str.maketrans("", "", string.punctuation))

        score = fuzz.ratio(term, window)
        if score >= threshold:
            return True

    return False


def extract_clinical_concepts(text: str) -> Set[str]:
    """
    Extract clinical concepts from text using the CLINICAL_CONCEPTS dictionary.
    Returns a set of concept IDs (e.g., {'RISK_FLOOD_EXPOSURE', 'SX_JAUNDICE'}).

    Uses a two-phase approach:
      Phase 1 (Exact): Regex word-boundary matching (deterministic, zero risk).
      Phase 2 (Fuzzy): Length-tiered fuzzy matching for remaining terms to catch
                       typos and Tagalog morphological variations.
    """
    if not text:
        return set()

    text_lower = text.lower()
    found_concepts = set()
    matched_terms = set()  # Track which terms already matched exactly

    # --- Phase 1: Exact regex matching (unchanged from original) ---
    for term, concept_id in config.CLINICAL_CONCEPTS.items():
        escaped_term = re.escape(term)
        pattern = rf"\b{escaped_term}\b"

        if re.search(pattern, text_lower):
            found_concepts.add(concept_id)
            matched_terms.add(term)

    # --- Phase 2: Fuzzy matching for unmatched terms ---
    for term, concept_id in config.CLINICAL_CONCEPTS.items():
        if term in matched_terms:
            continue  # Already matched exactly
        if concept_id in found_concepts:
            continue  # Concept already found via another term

        if _fuzzy_match_term(term, text_lower):
            found_concepts.add(concept_id)
            print(
                f"[FUZZY-MATCH] '{term}' -> {concept_id} (threshold={_get_fuzzy_threshold(term)}%)"
            )

    return found_concepts


def pre_screen_unrelated(text: str, lang: str = "en") -> dict:
    """
    TIER 3: Pre-screen for symptoms from completely unrelated medical categories.

    These indicate conditions outside the infectious disease scope and require
    immediate referral without ML classification.

    Args:
        text: The symptom text to analyze
        lang: Language code ("en" or "tl") for referral messages

    Returns:
        {
            "is_unrelated": bool,
            "category": str or None (e.g., "CARDIOVASCULAR", "MENTAL_HEALTH"),
            "detected_concepts": list of concept IDs,
            "referral_message": dict with "en" and "tl" keys
        }
    """
    if not text:
        return {
            "is_unrelated": False,
            "category": None,
            "detected_concepts": [],
            "referral_message": None,
        }

    text_lower = text.lower()
    found_concepts = set()
    matched_terms = set()  # Track which terms already matched exactly

    # --- Phase 1: Exact regex matching ---
    for term, concept_id in config.UNRELATED_CATEGORY_CONCEPTS.items():
        escaped_term = re.escape(term)
        pattern = rf"\b{escaped_term}\b"

        if re.search(pattern, text_lower):
            found_concepts.add(concept_id)
            matched_terms.add(term)

    # --- Phase 2: Fuzzy matching for unmatched terms ---
    for term, concept_id in config.UNRELATED_CATEGORY_CONCEPTS.items():
        if term in matched_terms:
            continue  # Already matched exactly
        if concept_id in found_concepts:
            continue  # Concept already found via another term

        if _fuzzy_match_term(term, text_lower):
            found_concepts.add(concept_id)
            print(
                f"[TIER3-FUZZY] '{term}' -> {concept_id} (threshold={_get_fuzzy_threshold(term)}%)"
            )

    # Early return if no Tier 3 concepts detected
    if not found_concepts:
        return {
            "is_unrelated": False,
            "category": None,
            "detected_concepts": [],
            "referral_message": None,
        }

    # --- Count concepts per category ---
    # Require 2+ co-occurring concepts from the SAME category to flag for referral
    category_counts: Dict[str, List[str]] = {}
    for concept in found_concepts:
        category = config.TIER3_CONCEPT_TO_CATEGORY.get(concept)
        if category:
            if category not in category_counts:
                category_counts[category] = []
            category_counts[category].append(concept)

    # Find first category with 2+ concepts (prioritize by count)
    flagged_category = None
    flagged_concepts = []
    for category, concepts in sorted(category_counts.items(), key=lambda x: -len(x[1])):
        if len(concepts) >= 2:
            flagged_category = category
            flagged_concepts = concepts
            break

    if not flagged_category:
        # Found Tier 3 concepts but not enough co-occurring in same category
        return {
            "is_unrelated": False,
            "category": None,
            "detected_concepts": list(found_concepts),
            "referral_message": None,
        }

    # Get the referral message for this category
    referral_message = config.TIER3_REFERRAL_MESSAGES.get(
        flagged_category,
        {
            "en": "Please consult a healthcare provider for proper evaluation.",
            "tl": "Mangyaring kumonsulta sa healthcare provider para sa tamang pagsusuri.",
        },
    )

    print(
        f"[TIER3-REFERRAL] Category: {flagged_category}, Concepts: {flagged_concepts}"
    )

    return {
        "is_unrelated": True,
        "category": flagged_category,
        "detected_concepts": flagged_concepts,
        "referral_message": referral_message,
    }


class OntologyBuilder:
    """
    Builds a dynamic symptom ontology from the question bank.
    Each disease gets a set of VALID CLINICAL CONCEPT IDs extracted from its questions.
    """

    def __init__(self, question_bank_en: dict, question_bank_tl: dict):
        self.profiles: Dict[str, Set[str]] = {}
        self._build_profiles(question_bank_en, label="EN")
        self._build_profiles(question_bank_tl, label="TL")
        print(
            f"[ONTOLOGY] Built profiles for {len(self.profiles)} diseases (EN + TL merged)"
        )

    def _build_profiles(self, question_bank: dict, label: str = ""):
        """Extract concepts from each disease's questions to build its symptom profile."""
        for disease, questions in question_bank.items():
            if disease not in self.profiles:
                self.profiles[disease] = set()

            for q in questions:
                # Extract concepts from question text and symptom descriptions
                text_sources = [
                    q.get("question", ""),
                    q.get("positive_symptom", ""),
                    q.get("negative_symptom", ""),
                ]
                for text in text_sources:
                    concepts = extract_clinical_concepts(text)
                    self.profiles[disease].update(concepts)

    def get_profile(self, disease: str) -> Set[str]:
        """Get the valid Concept IDs for a disease."""
        return self.profiles.get(disease, set())


class VerificationLayer:
    """
    Neuro-Symbolic Verification Layer.
    Compares extracted clinical concepts from user input against the predicted disease's ontology.
    Flags OUT_OF_SCOPE if high-value concepts are unexplained.
    """

    def __init__(self, ontology: OntologyBuilder):
        self.ontology = ontology

    def verify(self, text: str, predicted_disease: str) -> dict:
        """
        Verify if the input text is consistent with the predicted disease.

        Returns:
            {
                "is_valid": bool,
                "unexplained_concepts": set of concept IDs,
                "reason": str (if invalid)
            }
        """
        # Extract high-value concepts from input
        extracted = extract_clinical_concepts(text)
        high_value_extracted = extracted & config.HIGH_VALUE_CONCEPTS

        if not high_value_extracted:
            # No high-value concepts found - allow prediction to proceed
            return {"is_valid": True, "unexplained_concepts": set(), "reason": None}

        # Get the disease profile (Set of Concept IDs)
        disease_profile = self.ontology.get_profile(predicted_disease)

        # Check if each high-value concept is in the disease profile
        unexplained = set()
        for concept in high_value_extracted:
            if concept not in disease_profile:
                unexplained.add(concept)

        if unexplained:
            return {
                "is_valid": False,
                "unexplained_concepts": unexplained,
                "reason": f"Clinical concepts not associated with {predicted_disease}: {unexplained}",
            }

        return {"is_valid": True, "unexplained_concepts": set(), "reason": None}
