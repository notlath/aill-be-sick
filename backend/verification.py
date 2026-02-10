
import re
import config
from typing import Dict, Set, List, Optional

def extract_clinical_concepts(text: str) -> Set[str]:
    """
    Extract clinical concepts from text using the CLINICAL_CONCEPTS dictionary.
    Returns a set of concept IDs (e.g., {'RISK_FLOOD_EXPOSURE', 'SX_JAUNDICE'}).
    Uses regex word boundaries to avoid partial matches (e.g., 'ihi' in 'nanghihina').
    """
    if not text:
        return set()
        
    text_lower = text.lower()
    found_concepts = set()
    
    # Check for each clinical concept term with word boundaries
    # Optimization: Compile regexes if this is slow, but for now simple loop is fine
    for term, concept_id in config.CLINICAL_CONCEPTS.items():
        # Escape term for regex safety
        escaped_term = re.escape(term)
        # Pattern: \bterm\b (whole word match)
        pattern = fr"\b{escaped_term}\b"
        
        if re.search(pattern, text_lower):
            found_concepts.add(concept_id)
    
    return found_concepts


class OntologyBuilder:
    """
    Builds a dynamic symptom ontology from the question bank.
    Each disease gets a set of VALID CLINICAL CONCEPT IDs extracted from its questions.
    """
    
    def __init__(self, question_bank_en: dict, question_bank_tl: dict):
        self.profiles: Dict[str, Set[str]] = {}
        self._build_profiles(question_bank_en)
        self._build_profiles(question_bank_tl)
        print(f"[ONTOLOGY] Built profiles for {len(self.profiles)} diseases")
    
    def _build_profiles(self, question_bank: dict):
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
