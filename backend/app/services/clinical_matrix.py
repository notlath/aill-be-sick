"""
Structured Clinical Ontology for infectious disease diagnosis.
Source: Philippine Department of Health (DOH), PSMID Guidelines, WHO Case Definitions, WHO IMCI.

This dictionary powers the Clinical Guardrail Layer (Rules Engine).
"""

from typing import Dict, Any

# Map lay terms (English/Tagalog) to unified clinical concepts
SYMPTOM_MAP = {
    # Fever
    "fever": "fever",
    "lagnat": "fever",
    "mainit": "fever",
    "feverish": "fever",
    "mataas ang lagnat": "fever",
    # Headaches/Pains
    "headache": "headache",
    "sakit ng ulo": "headache",
    "severe headache": "severe_headache",
    "retro-orbital pain": "retro_orbital_pain",
    "pain behind eyes": "retro_orbital_pain",
    "sakit sa likod ng mata": "retro_orbital_pain",
    "muscle aches": "severe_myalgia",
    "body aches": "severe_myalgia",
    "sakit sa katawan": "severe_myalgia",
    "joint pain": "severe_arthralgia",
    "sakit sa kasukasuan": "severe_arthralgia",
    "abdominal pain": "abdominal_pain",
    "stomach pain": "abdominal_pain",
    "sakit ng tiyan": "abdominal_pain",
    "severe stomach pain": "severe_abdominal_pain",
    "sobrang sakit ng tiyan": "severe_abdominal_pain",
    "chest pain": "chest_pain",
    "sakit sa dibdib": "chest_pain",
    # GI/Stool/Vomiting
    "vomiting": "vomiting",
    "nagsusuka": "vomiting",
    "persistent vomiting": "persistent_vomiting",
    "diarrhea": "diarrhea",
    "loose stool": "diarrhea",
    "nagtatae": "diarrhea",
    "constipation": "constipation",
    "di makadumi": "constipation",
    "blood in stool": "bloody_stool",
    "dugo sa dumi": "bloody_stool",
    "melena": "melena",
    "black stool": "melena",
    "itim na dumi": "melena",
    # Respiratory/EENT
    "cough": "cough",
    "ubo": "cough",
    "dry cough": "dry_cough",
    "productive cough": "productive_cough",
    "phlegm": "productive_cough",
    "plema": "productive_cough",
    "shortness of breath": "shortness_of_breath",
    "hirap huminga": "shortness_of_breath",
    "fast breathing": "fast_breathing",
    "mabilis huminga": "fast_breathing",
    "chest indrawing": "chest_indrawing",
    "coryza": "coryza",
    "runny nose": "coryza",
    "sipon": "coryza",
    "sore throat": "sore_throat",
    "masakit ang lalamunan": "sore_throat",
    "conjunctivitis": "conjunctivitis",
    "red eyes": "conjunctivitis",
    "namumula ang mata": "conjunctivitis",
    # Bleeding/Warning signs
    "bleeding gums": "mucosal_bleeding",
    "dugo sa gilagid": "mucosal_bleeding",
    "nosebleed": "mucosal_bleeding",
    "epistaxis": "mucosal_bleeding",
    "drowsy": "lethargy",
    "lethargic": "lethargy",
    "irritable": "irritability",
    "sunken eyes": "sunken_eyes",
    "lubog ang mata": "sunken_eyes",
    "unable to drink": "unable_to_drink",
    "poor skin turgor": "poor_skin_turgor",
    "extreme thirst": "extreme_thirst",
    # Misc
    "rash": "rash",
    "pantal": "rash",
    "red spots": "rash",
    "rose spots": "rose_spots",
    "good appetite": "normal_appetite",
    "kumakain": "normal_appetite",
    "sudden onset": "abrupt_onset",
    "biglang nagkasakit": "abrupt_onset",
    "slow onset": "gradual_onset",
}

CLINICAL_MATRIX: Dict[str, Dict[str, Any]] = {
    "DENGUE": {
        "mandatory_criteria": ["fever"],
        "duration_constraints": {"min_days": 2, "max_days": 10},
        "major_symptoms": [
            "severe_headache",
            "retro_orbital_pain",
            "severe_myalgia",
            "severe_arthralgia",
            "rash",
            "positive_tourniquet_test",
        ],
        "minor_symptoms": [
            "mild_headache",
            "nausea",
            "vomiting",
            "mild_abdominal_pain",
        ],
        "red_flags": [
            "severe_abdominal_pain",
            "persistent_vomiting",
            "mucosal_bleeding",
            "melena",
            "lethargy",
            "irritability",
            "shortness_of_breath",
            "arterial_hypotension",
            "pleural_effusion",
        ],
        "contradictory_signals": [
            "fever_duration_gt_10_days",
            "productive_cough",
            "normal_appetite",
        ],
        "who_threshold": "mandatory_criteria_met AND (count(major_symptoms) + count(minor_symptoms)) >= 2",
    },
    "TYPHOID": {
        "mandatory_criteria": ["fever"],
        "duration_constraints": {"min_days": 3, "max_days": 30},
        "major_symptoms": ["abdominal_pain", "diarrhea", "constipation", "rose_spots"],
        "minor_symptoms": ["headache", "fatigue", "dry_cough"],
        "red_flags": ["melena", "severe_abdominal_pain", "lethargy"],
        "contradictory_signals": ["abrupt_onset", "severe_coryza"],
        "who_threshold": "mandatory_criteria_met AND (fever_duration_gt_3_days) AND (count(major_symptoms) >= 1)",
    },
    "INFLUENZA": {
        "mandatory_criteria": ["fever", "cough"],
        "duration_constraints": {"min_days": 1, "max_days": 7},
        "major_symptoms": ["abrupt_onset", "severe_myalgia", "sore_throat"],
        "minor_symptoms": ["headache", "coryza", "fatigue"],
        "red_flags": ["shortness_of_breath", "chest_pain", "lethargy"],
        "contradictory_signals": ["gradual_onset", "bloody_stool"],
        "who_threshold": "mandatory_criteria_met AND count(major_symptoms) >= 1",
    },
    "MEASLES": {
        "mandatory_criteria": ["fever", "rash"],
        "duration_constraints": {"min_days": 3, "max_days": 14},
        "major_symptoms": ["cough", "coryza", "conjunctivitis"],  # The 3 Cs
        "minor_symptoms": ["koplik_spots", "lethargy", "loss_of_appetite"],
        "red_flags": ["shortness_of_breath", "chest_indrawing", "lethargy"],
        "contradictory_signals": ["rash_starts_on_legs", "no_fever_before_rash"],
        "who_threshold": "mandatory_criteria_met AND count(major_symptoms) >= 1",
    },
    "PNEUMONIA": {
        "mandatory_criteria": ["cough", "shortness_of_breath"],  # Or fast_breathing
        "duration_constraints": {"min_days": 1, "max_days": 14},
        "major_symptoms": ["fast_breathing", "fever", "chest_pain", "productive_cough"],
        "minor_symptoms": ["fatigue", "loss_of_appetite"],
        "red_flags": [
            "chest_indrawing",
            "cyanosis",
            "stridor",
            "unable_to_drink",
            "lethargy",
        ],
        "contradictory_signals": ["clear_breathing", "no_cough"],
        "who_threshold": "mandatory_criteria_met AND count(major_symptoms) >= 1",
    },
    "DIARRHEA": {
        "mandatory_criteria": ["diarrhea"],  # Defined as >=3 loose stools/24h
        "duration_constraints": {"min_days": 1, "max_days": 14},
        "major_symptoms": ["abdominal_pain", "vomiting", "fever", "extreme_thirst"],
        "minor_symptoms": ["nausea", "loss_of_appetite", "fatigue"],
        "red_flags": [
            "sunken_eyes",
            "poor_skin_turgor",
            "unable_to_drink",
            "lethargy",
            "bloody_stool",
        ],
        "contradictory_signals": ["constipation", "normal_formed_stool"],
        "who_threshold": "mandatory_criteria_met",
    },
}

CLINICAL_MATRIX: Dict[str, Dict[str, Any]] = {
    "DENGUE": {
        "mandatory_criteria": ["fever"],
        "duration_constraints": {"min_days": 2, "max_days": 10},
        "major_symptoms": [
            "severe_headache",
            "retro_orbital_pain",
            "severe_myalgia",
            "severe_arthralgia",
            "rash",
            "positive_tourniquet_test",
        ],
        "minor_symptoms": [
            "mild_headache",
            "nausea",
            "vomiting",
            "mild_abdominal_pain",
        ],
        "red_flags": [
            # DOH/PPS-PIDSP warning signs
            "severe_abdominal_pain",
            "persistent_vomiting",
            "mucosal_bleeding",
            "melena",  # gastrointestinal bleeding
            "lethargy",
            "irritability",
            "shortness_of_breath",
            "arterial_hypotension",
            "pleural_effusion",
        ],
        "contradictory_signals": [
            "fever_duration_gt_10_days",
            "productive_cough_with_phlegm",
            "normal_appetite",
        ],
        "who_threshold": "mandatory_criteria_met AND (count(major_symptoms) + count(minor_symptoms)) >= 2",
    },
    # Placeholders for the rest to be researched next
    "TYPHOID": {},
    "PNEUMONIA": {},
    "INFLUENZA": {},
    "MEASLES": {},
    "DIARRHEA": {},
}


def get_mapped_symptoms(raw_symptoms: list[str]) -> list[str]:
    """Map raw text symptoms to standardized clinical concepts."""
    mapped = set()
    for sym in raw_symptoms:
        # Simple lookup for now; can be expanded with NLP/fuzzy matching
        clean_sym = sym.lower().strip()
        if clean_sym in SYMPTOM_MAP:
            mapped.add(SYMPTOM_MAP[clean_sym])
    return list(mapped)
