"""
Configuration constants for the disease prediction system.
Centralizes all thresholds and configuration values in one place.
"""
import os

# --- Model Paths ---
ENG_MODEL_PATH = "notlath/BioClinical-ModernBERT-base-Symptom2Disease_WITH-DROPOUT-42"
FIL_MODEL_PATH = "notlath/RoBERTa-Tagalog-base-Symptom2Disease_WITH-DROPOUT-42"

# --- Symptom Validation Thresholds ---
# Configurable gating thresholds for validating symptom narratives
# Reject very short/off-topic inputs and low-confidence/high-uncertainty predictions

# Hard thresholds: reject if below/above these
SYMPTOM_MIN_CONF = float(os.getenv("SYMPTOM_MIN_CONF", "0.50"))
SYMPTOM_MAX_MI = float(os.getenv("SYMPTOM_MAX_MI", "0.10"))

# Soft-accept band: allow follow-ups to proceed when signal exists but is below hard threshold
SYMPTOM_SOFT_MIN_CONF = float(os.getenv("SYMPTOM_SOFT_MIN_CONF", "0.35"))
SYMPTOM_SOFT_MAX_MI = float(os.getenv("SYMPTOM_SOFT_MAX_MI", "0.12"))

# Require at least N words OR M characters before attempting a diagnosis
SYMPTOM_MIN_WORDS = int(os.getenv("SYMPTOM_MIN_WORDS", "3"))
SYMPTOM_MIN_CHARS = int(os.getenv("SYMPTOM_MIN_CHARS", "15"))

# --- Diagnosis Confidence Thresholds ---
# Very high confidence - skip follow-up questions entirely
HIGH_CONFIDENCE_THRESHOLD = float(os.getenv("HIGH_CONFIDENCE_THRESHOLD", "0.95"))
LOW_UNCERTAINTY_THRESHOLD = float(os.getenv("LOW_UNCERTAINTY_THRESHOLD", "0.01"))

# Thesis-aligned thresholds for VALID predictions (per sensitivity analysis)
# Predictions below these are considered unreliable and should be flagged
VALID_MIN_CONF = float(os.getenv("VALID_MIN_CONF", "0.70"))  # Thesis: 70%
VALID_MAX_UNCERTAINTY = float(os.getenv("VALID_MAX_UNCERTAINTY", "0.05"))  # Thesis: 5%

# Low confidence - stop asking questions after MAX_QUESTIONS_THRESHOLD
LOW_CONFIDENCE_THRESHOLD = float(os.getenv("LOW_CONFIDENCE_THRESHOLD", "0.65"))

# --- Follow-up Question Limits ---
MAX_QUESTIONS_THRESHOLD = int(os.getenv("MAX_QUESTIONS_THRESHOLD", "8"))
EXHAUSTED_QUESTIONS_THRESHOLD = int(os.getenv("EXHAUSTED_QUESTIONS_THRESHOLD", "10"))

# --- Triage Thresholds ---
# Determine triage level based on confidence and uncertainty
TRIAGE_HIGH_CONFIDENCE = float(os.getenv("TRIAGE_HIGH_CONFIDENCE", "0.90"))
TRIAGE_LOW_UNCERTAINTY = float(os.getenv("TRIAGE_LOW_UNCERTAINTY", "0.03"))

# --- Medical Keywords for Semantic Filtering ---
# Basic health-related terms used to validate that input is medical in nature
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

# --- Neuro-Symbolic Verification: Clinical Concept Ontology ---
# Maps raw terms (EN/TL) to standardized clinical concepts.
# Used by VerificationLayer to detect symptoms/risk factors outside the 6 in-scope diseases.
# Format: { "raw_term": "CONCEPT_ID" }
CLINICAL_CONCEPTS = {
    # Risk Factors - Environmental Exposure
    "flood": "RISK_FLOOD_EXPOSURE",
    "baha": "RISK_FLOOD_EXPOSURE",
    "floodwater": "RISK_FLOOD_EXPOSURE",
    "tubig baha": "RISK_FLOOD_EXPOSURE",
    "lumusong": "RISK_FLOOD_EXPOSURE",
    "rat": "RISK_RODENT_EXPOSURE",
    "daga": "RISK_RODENT_EXPOSURE",
    "rodent": "RISK_RODENT_EXPOSURE",
    "mouse": "RISK_RODENT_EXPOSURE",
    "mice": "RISK_RODENT_EXPOSURE",
    "urine": "RISK_CONTAMINATED_WATER",
    "ihi": "RISK_CONTAMINATED_WATER",
    
    # Distinctive Symptoms - Sensory Loss (COVID-19 indicative)
    "loss of taste": "SX_AGEUSIA",
    "lost taste": "SX_AGEUSIA",
    "can't taste": "SX_AGEUSIA",
    "no taste": "SX_AGEUSIA",
    "lost my sense of taste": "SX_AGEUSIA",
    "lost sense of taste": "SX_AGEUSIA",
    "no sense of taste": "SX_AGEUSIA",
    "walang panlasa": "SX_AGEUSIA",
    "nawalan ng panlasa": "SX_AGEUSIA",
    
    "loss of smell": "SX_ANOSMIA",
    "lost smell": "SX_ANOSMIA",
    "can't smell": "SX_ANOSMIA",
    "no smell": "SX_ANOSMIA",
    "lost my sense of smell": "SX_ANOSMIA",
    "lost sense of smell": "SX_ANOSMIA",
    "no sense of smell": "SX_ANOSMIA",
    "walang pang-amoy": "SX_ANOSMIA",
    "nawalan ng pang-amoy": "SX_ANOSMIA",
    
    # Distinctive Symptoms - Hepatic (Leptospirosis/Hepatitis indicative)
    "yellow skin": "SX_JAUNDICE",
    "naninilaw": "SX_JAUNDICE",
    "jaundice": "SX_JAUNDICE",
    "yellowish": "SX_JAUNDICE",
    "kulay tsaa": "SX_DARK_URINE",
    "dark urine": "SX_DARK_URINE",
    "tea-colored urine": "SX_DARK_URINE",
    
    # Distinctive Symptoms - Ocular (Leptospirosis indicative)
    "red eyes": "SX_CONJUNCTIVAL_SUFFUSION",
    "namumula ang mata": "SX_CONJUNCTIVAL_SUFFUSION",
    "bloodshot eyes": "SX_CONJUNCTIVAL_SUFFUSION",
}

# Concepts that MUST be explained by the predicted disease ontology.
# If these are found in input but NOT in the disease profile, flag OUT_OF_SCOPE.
HIGH_VALUE_CONCEPTS = {
    "RISK_FLOOD_EXPOSURE",
    "RISK_RODENT_EXPOSURE", 
    "RISK_CONTAMINATED_WATER",
    "SX_AGEUSIA",
    "SX_ANOSMIA",
    "SX_JAUNDICE",
    "SX_DARK_URINE",
    "SX_CONJUNCTIVAL_SUFFUSION",
}

