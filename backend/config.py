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
