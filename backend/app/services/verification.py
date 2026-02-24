
import re
import app.config as config
from typing import Dict, Set, List, Optional
from rapidfuzz import fuzz


def _get_fuzzy_threshold(term: str) -> int:
    """Return the similarity threshold based on term length."""
    length = len(term)
    if length <= 4:
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

    for i in range(len(words) - term_word_count + 1):
        window = " ".join(words[i : i + term_word_count])
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
        pattern = fr"\b{escaped_term}\b"
        
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
            print(f"[FUZZY-MATCH] '{term}' -> {concept_id} (threshold={_get_fuzzy_threshold(term)}%)")
    
    return found_concepts


class OntologyBuilder:
    """
    Builds a dynamic symptom ontology from the question bank.
    Each disease gets a set of VALID CLINICAL CONCEPT IDs extracted from its questions.
    """
    
    def __init__(self, question_bank_en: dict, question_bank_tl: dict):
        self.profiles: Dict[str, Set[str]] = {}
        self._build_profiles(question_bank_en, label="EN")
        self._build_profiles(question_bank_tl, label="TL")
        print(f"[ONTOLOGY] Built profiles for {len(self.profiles)} diseases (EN + TL merged)")
    
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
                "reason": f"Clinical concepts not associated with {predicted_disease}: {unexplained}"
            }
        
        return {"is_valid": True, "unexplained_concepts": set(), "reason": None}
