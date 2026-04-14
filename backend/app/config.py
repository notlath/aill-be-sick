"""
Configuration constants for the disease prediction system.
Centralizes all thresholds and configuration values in one place.
"""

import os

# --- Model Paths ---
ENG_MODEL_PATH = "notlath/BioClinical-ModernBERT-base-Symptom2Disease_WITH-DROPOUT-42"
FIL_MODEL_PATH = "notlath/RoBERTa-Tagalog-base-Symptom2Disease_WITH-DROPOUT-42"
ENG_MODEL_REVISION = os.getenv("ENG_MODEL_REVISION", "").strip() or None
FIL_MODEL_REVISION = os.getenv("FIL_MODEL_REVISION", "").strip() or None

# --- Deterministic Inference (MC Dropout) ---
# Keep stochastic dropout behavior while making outputs reproducible across environments.
MCD_DETERMINISTIC = os.getenv("MCD_DETERMINISTIC", "true").lower() == "true"
MCD_BASE_SEED = int(os.getenv("MCD_BASE_SEED", "20260322"))
MCD_SEED_SALT = os.getenv("MCD_SEED_SALT", "aill-be-sick")

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
HIGH_CONFIDENCE_THRESHOLD = float(os.getenv("HIGH_CONFIDENCE_THRESHOLD", "0.90"))
LOW_UNCERTAINTY_THRESHOLD = float(os.getenv("LOW_UNCERTAINTY_THRESHOLD", "0.01"))

# Evidence-based stop (after follow-up evidence coverage is already high)
EVIDENCE_STOP_PRIMARY_COVERAGE = int(os.getenv("EVIDENCE_STOP_PRIMARY_COVERAGE", "3"))
EVIDENCE_STOP_CONF_THRESHOLD = float(os.getenv("EVIDENCE_STOP_CONF_THRESHOLD", "0.90"))
EVIDENCE_STOP_MAX_UNCERTAINTY = float(
    os.getenv("EVIDENCE_STOP_MAX_UNCERTAINTY", "0.03")
)

# --- Uncertainty Quantification Thresholds ---
# Multi-metric uncertainty thresholds (data-driven, adjust based on validation)

# Confidence thresholds
VALID_MIN_CONF = float(os.getenv("VALID_MIN_CONF", "0.75"))  # Thesis: 70%

# Mutual Information (epistemic uncertainty)
VALID_MAX_UNCERTAINTY = float(os.getenv("VALID_MAX_UNCERTAINTY", "0.04"))  # Thesis: 5%

# Variance threshold (prediction stability)
VALID_MAX_VARIANCE = float(os.getenv("VALID_MAX_VARIANCE", "0.02"))

# Coefficient of Variation threshold (relative uncertainty)
VALID_MAX_CV = float(os.getenv("VALID_MAX_CV", "0.15"))

# Ensemble disagreement threshold
VALID_MAX_DISAGREEMENT = float(os.getenv("VALID_MAX_DISAGREEMENT", "0.20"))

# Composite uncertainty: flag if ANY metric exceeds threshold
USE_COMPOSITE_UNCERTAINTY = (
    os.getenv("USE_COMPOSITE_UNCERTAINTY", "true").lower() == "true"
)

# Calibration settings
CALIBRATION_N_BINS = int(os.getenv("CALIBRATION_N_BINS", "10"))
TARGET_ECE = float(os.getenv("TARGET_ECE", "0.05"))  # Target Expected Calibration Error

# Temperature scaling for calibration
USE_TEMPERATURE_SCALING = (
    os.getenv("USE_TEMPERATURE_SCALING", "false").lower() == "true"
)
TEMPERATURE = float(
    os.getenv("TEMPERATURE", "1.0")
)  # 1.0 = no scaling, >1 = softer probs

# Low confidence - stop asking questions after MAX_QUESTIONS_THRESHOLD
LOW_CONFIDENCE_THRESHOLD = float(os.getenv("LOW_CONFIDENCE_THRESHOLD", "0.65"))

# --- Follow-up Question Limits ---
MAX_QUESTIONS_THRESHOLD = int(os.getenv("MAX_QUESTIONS_THRESHOLD", "8"))
EXHAUSTED_QUESTIONS_THRESHOLD = int(os.getenv("EXHAUSTED_QUESTIONS_THRESHOLD", "10"))

# --- EIG (Expected Information Gain) Configuration ---
# Early stopping: stop asking questions when EIG gain is too small
MIN_EIG_THRESHOLD = float(os.getenv("MIN_EIG_THRESHOLD", "0.015"))
EIG_DECAY_FACTOR = float(os.getenv("EIG_DECAY_FACTOR", "0.3"))

# Burden penalty: prefer easy-to-answer questions (burden scores 1-5)
BURDEN_PENALTY_FACTOR = float(os.getenv("BURDEN_PENALTY_FACTOR", "0.08"))

# Top-k differential EIG: score questions by how well they separate top disease contenders
TOP_K_DISEASES = int(os.getenv("TOP_K_DISEASES", "3"))
DIFFERENTIAL_EIG_WEIGHT = float(os.getenv("DIFFERENTIAL_EIG_WEIGHT", "0.7"))

# Confidence-aware mode switching thresholds
MODE_EXPLORATION_MAX_CONF = float(os.getenv("MODE_EXPLORATION_MAX_CONF", "0.50"))
MODE_CONFIRMATION_MIN_CONF = float(os.getenv("MODE_CONFIRMATION_MIN_CONF", "0.65"))
MODE_RULE_OUT_SECOND_MIN = float(os.getenv("MODE_RULE_OUT_SECOND_MIN", "0.20"))

# Novelty penalty: soft-penalize questions similar to already-asked ones
NOVELTY_PENALTY_WEIGHT = float(os.getenv("NOVELTY_PENALTY_WEIGHT", "0.12"))

# --- Triage Thresholds (3-Tier System) ---
# Thesis-backed thresholds for clinical risk stratification
# Based on: ECE calibration (0.084), sensitivity analysis, ROC/PR optimization
# Aligned with frontend RELIABILITY_THRESHOLDS in constants/reliability-thresholds.ts

# LOW PRIORITY (Green): Automated diagnosis
# Requires: High confidence AND low uncertainty
TRIAGE_HIGH_CONFIDENCE = float(os.getenv("TRIAGE_HIGH_CONFIDENCE", "0.90"))
TRIAGE_LOW_UNCERTAINTY = float(os.getenv("TRIAGE_LOW_UNCERTAINTY", "0.03"))

# MEDIUM PRIORITY (Yellow): Nurse review required
# Confidence between 70-90% OR moderate uncertainty (0.03-0.08)
TRIAGE_MEDIUM_CONFIDENCE_MIN = float(os.getenv("TRIAGE_MEDIUM_CONFIDENCE_MIN", "0.70"))
TRIAGE_MEDIUM_UNCERTAINTY_MAX = float(
    os.getenv("TRIAGE_MEDIUM_UNCERTAINTY_MAX", "0.08")
)

# HIGH PRIORITY (Red): Physician review required
# Confidence below 70% OR high uncertainty (>0.08)
# Note: TRIAGE_MEDIUM_CONFIDENCE_MIN serves as the threshold

# --- Illness Clustering Derived Variables & Actionable Insights ---

# Risk derivation thresholds and weights
ILLNESS_CLUSTER_RISK_HIGH_THRESHOLD = float(
    os.getenv("ILLNESS_CLUSTER_RISK_HIGH_THRESHOLD", "0.67")
)
ILLNESS_CLUSTER_RISK_MEDIUM_THRESHOLD = float(
    os.getenv("ILLNESS_CLUSTER_RISK_MEDIUM_THRESHOLD", "0.34")
)
ILLNESS_CLUSTER_RISK_UNCERTAINTY_CAP = float(
    os.getenv("ILLNESS_CLUSTER_RISK_UNCERTAINTY_CAP", "0.25")
)
ILLNESS_CLUSTER_RISK_LOW_CONFIDENCE_WEIGHT = float(
    os.getenv("ILLNESS_CLUSTER_RISK_LOW_CONFIDENCE_WEIGHT", "0.20")
)
ILLNESS_CLUSTER_RISK_UNCERTAINTY_WEIGHT = float(
    os.getenv("ILLNESS_CLUSTER_RISK_UNCERTAINTY_WEIGHT", "0.30")
)
ILLNESS_CLUSTER_RISK_AGE_WEIGHT = float(
    os.getenv("ILLNESS_CLUSTER_RISK_AGE_WEIGHT", "0.10")
)
ILLNESS_CLUSTER_RISK_DISEASE_WEIGHT = float(
    os.getenv("ILLNESS_CLUSTER_RISK_DISEASE_WEIGHT", "0.40")
)
ILLNESS_CLUSTER_RISK_NORMALIZATION_MAX = float(
    os.getenv("ILLNESS_CLUSTER_RISK_NORMALIZATION_MAX", "1.5")
)
ILLNESS_CLUSTER_RISK_DISEASE_BASE = {
    "DENGUE": 0.85,
    "PNEUMONIA": 0.75,
    "TYPHOID": 0.65,
    "MEASLES": 0.60,
    "DIARRHEA": 0.45,
    "INFLUENZA": 0.40,
    "UNKNOWN": 0.50,
}

# Symptom severity derivation thresholds and weights
ILLNESS_CLUSTER_SEVERITY_HIGH_THRESHOLD = float(
    os.getenv("ILLNESS_CLUSTER_SEVERITY_HIGH_THRESHOLD", "0.67")
)
ILLNESS_CLUSTER_SEVERITY_MEDIUM_THRESHOLD = float(
    os.getenv("ILLNESS_CLUSTER_SEVERITY_MEDIUM_THRESHOLD", "0.34")
)
ILLNESS_CLUSTER_SEVERITY_COUNT_CAP = int(
    os.getenv("ILLNESS_CLUSTER_SEVERITY_COUNT_CAP", "10")
)
ILLNESS_CLUSTER_SEVERITY_HIGH_IMPACT_WEIGHT = float(
    os.getenv("ILLNESS_CLUSTER_SEVERITY_HIGH_IMPACT_WEIGHT", "0.55")
)
ILLNESS_CLUSTER_SEVERITY_BURDEN_WEIGHT = float(
    os.getenv("ILLNESS_CLUSTER_SEVERITY_BURDEN_WEIGHT", "0.45")
)
ILLNESS_CLUSTER_SEVERITY_KEYWORDS_HIGH_IMPACT = {
    "chest pain",
    "difficulty breathing",
    "shortness of breath",
    "bleeding",
    "blood",
    "dehydration",
    "severe",
    "persistent",
    "matinding",
    "hirap huminga",
    "pagdurugo",
    "dugo",
    "malubha",
    "hindi makahinga",
}

# Comorbidity keyword list and normalization caps
ILLNESS_CLUSTER_COMORBIDITY_KEYWORDS = {
    "diabetes",
    "hypertension",
    "high blood",
    "heart disease",
    "asthma",
    "copd",
    "kidney disease",
    "ckd",
    "cancer",
    "immunocompromised",
    "obesity",
    "stroke",
    "tb",
    "tuberculosis",
    "hika",
    "altapresyon",
    "alta presyon",
    "diabetic",
    "sakit sa puso",
    "sakit sa bato",
}
ILLNESS_CLUSTER_COMORBIDITY_COUNT_CAP = int(
    os.getenv("ILLNESS_CLUSTER_COMORBIDITY_COUNT_CAP", "5")
)

# Actionable triage score weights and insight thresholds
ILLNESS_CLUSTER_TRIAGE_RISK_WEIGHT = float(
    os.getenv("ILLNESS_CLUSTER_TRIAGE_RISK_WEIGHT", "0.45")
)
ILLNESS_CLUSTER_TRIAGE_SEVERITY_WEIGHT = float(
    os.getenv("ILLNESS_CLUSTER_TRIAGE_SEVERITY_WEIGHT", "0.35")
)
ILLNESS_CLUSTER_TRIAGE_COMORBIDITY_WEIGHT = float(
    os.getenv("ILLNESS_CLUSTER_TRIAGE_COMORBIDITY_WEIGHT", "0.20")
)
ILLNESS_CLUSTER_TRIAGE_HIGH_RISK_THRESHOLD = float(
    os.getenv("ILLNESS_CLUSTER_TRIAGE_HIGH_RISK_THRESHOLD", "70.0")
)
ILLNESS_CLUSTER_TRIAGE_MEDIUM_RISK_THRESHOLD = float(
    os.getenv("ILLNESS_CLUSTER_TRIAGE_MEDIUM_RISK_THRESHOLD", "45.0")
)
ILLNESS_CLUSTER_INSIGHT_HIGH_RISK_PERCENT = float(
    os.getenv("ILLNESS_CLUSTER_INSIGHT_HIGH_RISK_PERCENT", "40.0")
)
ILLNESS_CLUSTER_INSIGHT_SEVERITY_PERCENT = float(
    os.getenv("ILLNESS_CLUSTER_INSIGHT_SEVERITY_PERCENT", "45.0")
)
ILLNESS_CLUSTER_INSIGHT_COMORBIDITY_AVG = float(
    os.getenv("ILLNESS_CLUSTER_INSIGHT_COMORBIDITY_AVG", "1.5")
)

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
    # Additional terminology from research
    "alipunga",
    "alta-presyon",
    "an-an",
    "beke",
    "bulate",
    "bulutong tubig",
    "buni",
    "galis",
    "hadhad",
    "hapdi habang umiihi",
    "hika",
    "hinimatay",
    "hirap sa paghinga",
    "kakapusan sa paghinga",
    "karamdaman",
    "katarata",
    "ketong",
    "kombulsyon",
    "kulugo",
    "kumakabog",
    "lula",
    "mabahong discharge",
    "matamlay",
    "nabarang",
    "nabati",
    "nabulunan",
    "nagkokombulsyon",
    "nagnanana",
    "nakulam",
    "nalipasan",
    "nangangatal",
    "nausog",
    "ngalay",
    "pagdilim ng paningin",
    "pagdudugo",
    "pagduduwal",
    "pagkaginaw",
    "pagkahapo",
    "pagkahilo",
    "pagkalason",
    "pagkalunod",
    "pagkalungkot",
    "pagkasunog ng balat",
    "pagkatuyo ng katawan",
    "pagka-ulyanin",
    "paglabo ng mata",
    "pagmamanas",
    "paka-hilo",
    "pamamantal",
    "pamamanhid",
    "pamumutla",
    "pananakit ng kasukasuhan",
    "pananakit ng likod",
    "pananakit ng puson",
    "pananakit ng tiyan",
    "pananakit ng ulo",
    "pangingimay",
    "panginginig ng katawan",
    "pangingisay",
    "pasma",
    "pasmo",
    "paso",
    "pinasok ng hangin",
    "pulmonya",
    "rayuma",
    "sakit ng ngipin",
    "sakit sa puso",
    "sunburn",
    "tetano",
    "tigdas",
    "trangkaso",
    "walang gana",
}

# =============================================================================
# THREE-TIER CONCEPT CLASSIFICATION SYSTEM
# =============================================================================
#
# This system classifies user symptom terms into three tiers:
#
# TIER 1 (IN_SCOPE_SYMPTOMS): Core symptoms of the 6 in-scope diseases
#        (Dengue, Diarrhea, Influenza, Measles, Pneumonia, Typhoid).
#        These NEVER trigger referral or verification failure.
#
# TIER 2 (CLINICAL_CONCEPTS + HIGH_VALUE_CONCEPTS): Distinctive symptoms that
#        may indicate out-of-scope diseases mimicking in-scope ones.
#        These require verification against disease ontology.
#
# TIER 3 (UNRELATED_CATEGORY_CONCEPTS): Symptoms from completely different
#        medical categories (STI, cardio, neuro, etc.) that require
#        immediate referral to appropriate specialist.
#
# Processing order: Check Tier 1 first (pass-through), then Tier 3 (immediate
# referral), then Tier 2 (verification against predicted disease).
# =============================================================================

# --- TIER 1: In-Scope Disease Symptoms ---
# Symptoms that belong to the 6 in-scope diseases. These should NEVER trigger
# referral or verification failure, as they are expected symptoms for conditions
# the system is trained to diagnose.
#
# Diseases covered: Dengue, Diarrhea, Influenza, Measles, Pneumonia, Typhoid
# Format: { "raw_term": "CONCEPT_ID" }
IN_SCOPE_SYMPTOMS = {
    # --- SX_HIGH_FEVER: High-grade fever (common to most in-scope diseases) ---
    "fever": "SX_HIGH_FEVER",
    "high fever": "SX_HIGH_FEVER",
    "mataas na lagnat": "SX_HIGH_FEVER",
    "lagnat": "SX_HIGH_FEVER",
    "nilalagnat": "SX_HIGH_FEVER",
    "may lagnat": "SX_HIGH_FEVER",
    # --- SX_MYALGIA: Muscle pain (Dengue, Influenza, Typhoid) ---
    "muscle pain": "SX_MYALGIA",
    "body aches": "SX_MYALGIA",
    "pananakit ng kalamnan": "SX_MYALGIA",
    "masakit ang kalamnan": "SX_MYALGIA",
    "pananakit ng katawan": "SX_MYALGIA",
    "masakit ang buong katawan": "SX_MYALGIA",
    # --- SX_ARTHRALGIA: Acute joint pain with fever (Dengue, Influenza) ---
    # Note: Chronic joint pain without fever goes to Tier 3 (musculoskeletal)
    "joint pain": "SX_ARTHRALGIA",
    "pananakit ng kasukasuan": "SX_ARTHRALGIA",
    "masakit ang kasukasuan": "SX_ARTHRALGIA",
    "masakit ang mga joints": "SX_ARTHRALGIA",
    # --- SX_HEADACHE: Headache (common to most in-scope diseases) ---
    "headache": "SX_HEADACHE",
    "sakit ng ulo": "SX_HEADACHE",
    "sumasakit ang ulo": "SX_HEADACHE",
    "masakit ang ulo": "SX_HEADACHE",
    "pananakit ng ulo": "SX_HEADACHE",
    # --- SX_NAUSEA_VOMITING: Nausea/vomiting (Dengue, Diarrhea, Typhoid) ---
    "nausea": "SX_NAUSEA_VOMITING",
    "vomiting": "SX_NAUSEA_VOMITING",
    "nauseous": "SX_NAUSEA_VOMITING",
    "nasusuka": "SX_NAUSEA_VOMITING",
    "pagsusuka": "SX_NAUSEA_VOMITING",
    "nagsusuka": "SX_NAUSEA_VOMITING",
    "sinusuka": "SX_NAUSEA_VOMITING",
    "naduduwal": "SX_NAUSEA_VOMITING",
    # --- SX_FATIGUE: Fatigue/tiredness (common to most in-scope diseases) ---
    "fatigue": "SX_FATIGUE",
    "tired": "SX_FATIGUE",
    "exhausted": "SX_FATIGUE",
    "pagod": "SX_FATIGUE",
    "nanghihina": "SX_FATIGUE",
    "napapagod": "SX_FATIGUE",
    "walang lakas": "SX_FATIGUE",
    "feeling weak": "SX_FATIGUE",
    # --- SX_CHILLS: Chills (Dengue, Influenza, Pneumonia, Typhoid) ---
    "chills": "SX_CHILLS",
    "panginginig": "SX_CHILLS",
    "giniginaw": "SX_CHILLS",
    "nanginginig": "SX_CHILLS",
    "ginaw": "SX_CHILLS",
    # --- SX_SHORTNESS_OF_BREATH: Dyspnea (Pneumonia) ---
    "shortness of breath": "SX_SHORTNESS_OF_BREATH",
    "difficulty breathing": "SX_SHORTNESS_OF_BREATH",
    "hard to breathe": "SX_SHORTNESS_OF_BREATH",
    "hirap huminga": "SX_SHORTNESS_OF_BREATH",
    "nahihirapan huminga": "SX_SHORTNESS_OF_BREATH",
    "kapos sa hininga": "SX_SHORTNESS_OF_BREATH",
    # --- SX_COUGH: Cough (Influenza, Measles, Pneumonia) ---
    "cough": "SX_COUGH",
    "coughing": "SX_COUGH",
    "ubo": "SX_COUGH",
    "inuubo": "SX_COUGH",
    "umuubo": "SX_COUGH",
    # --- SX_RUNNY_NOSE: Runny nose/coryza (Influenza, Measles) ---
    "runny nose": "SX_RUNNY_NOSE",
    "sipon": "SX_RUNNY_NOSE",
    "sinisipon": "SX_RUNNY_NOSE",
    "may sipon": "SX_RUNNY_NOSE",
    "barado ang ilong": "SX_RUNNY_NOSE",
    # --- SX_SORE_THROAT: Sore throat (Influenza) ---
    "sore throat": "SX_SORE_THROAT",
    "throat pain": "SX_SORE_THROAT",
    "masakit ang lalamunan": "SX_SORE_THROAT",
    "sakit ng lalamunan": "SX_SORE_THROAT",
    "makati ang lalamunan": "SX_SORE_THROAT",
    # --- SX_LOSS_OF_APPETITE: Anorexia (Dengue, Diarrhea, Typhoid) ---
    "no appetite": "SX_LOSS_OF_APPETITE",
    "loss of appetite": "SX_LOSS_OF_APPETITE",
    "not hungry": "SX_LOSS_OF_APPETITE",
    "walang gana": "SX_LOSS_OF_APPETITE",
    "walang gana kumain": "SX_LOSS_OF_APPETITE",
    "ayaw kumain": "SX_LOSS_OF_APPETITE",
    "nawalan ng gana": "SX_LOSS_OF_APPETITE",
    # --- SX_ABDOMINAL_PAIN: Abdominal pain (Diarrhea, Typhoid) ---
    "stomach pain": "SX_ABDOMINAL_PAIN",
    "abdominal pain": "SX_ABDOMINAL_PAIN",
    "belly pain": "SX_ABDOMINAL_PAIN",
    "sakit ng tiyan": "SX_ABDOMINAL_PAIN",
    "sumasakit ang tiyan": "SX_ABDOMINAL_PAIN",
    "masakit ang tiyan": "SX_ABDOMINAL_PAIN",
    "pananakit ng tiyan": "SX_ABDOMINAL_PAIN",
    # --- SX_DIARRHEA: Loose/watery stools (Diarrhea) ---
    "diarrhea": "SX_DIARRHEA",
    "loose stools": "SX_DIARRHEA",
    "watery stool": "SX_DIARRHEA",
    "pagtatae": "SX_DIARRHEA",
    "nagtatae": "SX_DIARRHEA",
    "lbm": "SX_DIARRHEA",
    "loose bowel": "SX_DIARRHEA",
    # --- SX_RASH: Acute rash with fever (Dengue, Measles) ---
    # Note: Chronic rash without fever goes to Tier 3 (dermatological)
    "rash": "SX_RASH",
    "skin rash": "SX_RASH",
    "pantal": "SX_RASH",
    "may pantal": "SX_RASH",
    "pamumula ng balat": "SX_RASH",
    # --- SX_WEAKNESS: General weakness (common to most in-scope diseases) ---
    "weakness": "SX_WEAKNESS",
    "weak": "SX_WEAKNESS",
    "mahina": "SX_WEAKNESS",
    "nanghihina": "SX_WEAKNESS",
    "panghihina": "SX_WEAKNESS",
    "walang lakas": "SX_WEAKNESS",
}

# --- TIER 2: Neuro-Symbolic Verification Clinical Concept Ontology ---
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
    # Distinctive Symptoms - Diabetes indicative (Out of Scope)
    # SX_POLYURIA (Frequent urination)
    "umihi": "SX_POLYURIA",
    "frequent urination": "SX_POLYURIA",
    "urinate": "SX_POLYURIA",
    "peeing": "SX_POLYURIA",
    "ihi nang ihi": "SX_POLYURIA",
    "madalas umihi": "SX_POLYURIA",
    # SX_POLYDIPSIA (Excessive thirst)
    "uhaw": "SX_POLYDIPSIA",
    "thirsty": "SX_POLYDIPSIA",
    "thirst": "SX_POLYDIPSIA",
    "dry mouth": "SX_POLYDIPSIA",
    "tuyong bibig": "SX_POLYDIPSIA",
    "tuyo ang lalamunan": "SX_POLYDIPSIA",
    "tuyong lalamunan": "SX_POLYDIPSIA",
    # SX_POLYPHAGIA (Excessive hunger)
    "gutom": "SX_POLYPHAGIA",
    "hungry": "SX_POLYPHAGIA",
    "hunger": "SX_POLYPHAGIA",
    "kain nang kain": "SX_POLYPHAGIA",
    "lagi akong gutom": "SX_POLYPHAGIA",
    "madalas gutom": "SX_POLYPHAGIA",
    # SX_WEIGHT_LOSS (Unexplained weight loss)
    "pumapayat": "SX_WEIGHT_LOSS",
    "weight loss": "SX_WEIGHT_LOSS",
    "losing weight": "SX_WEIGHT_LOSS",
    "bumababa ang timbang": "SX_WEIGHT_LOSS",
    # SX_SLOW_HEALING (Slow healing wounds)
    "ayaw gumaling": "SX_SLOW_HEALING",
    "not healing": "SX_SLOW_HEALING",
    "sugat na matagal gumaling": "SX_SLOW_HEALING",
    "sugat": "SX_SLOW_HEALING",  # Context sensitive, but often strong signal if persistent
    # SX_NEUROPATHY (Numbness/Tingling)
    "manhid": "SX_NEUROPATHY",
    "namamanhid": "SX_NEUROPATHY",
    "numbness": "SX_NEUROPATHY",
    "numb": "SX_NEUROPATHY",
    "tusok-tusok": "SX_NEUROPATHY",
    "tingling": "SX_NEUROPATHY",
    "pins and needles": "SX_NEUROPATHY",
    # SX_BLURRED_VISION
    "labo mata": "SX_BLURRED_VISION",
    "malabo ang mata": "SX_BLURRED_VISION",
    "blurred vision": "SX_BLURRED_VISION",
    "paningin": "SX_BLURRED_VISION",  # Context: "lumalabo na rin yung paningin"
    # --- NEW: PH-Specific Red Flags (Per Thesis Requirements) ---
    # F1. Dengue Confounders (Lepto, Malaria, Meningo)
    # Leptospirosis - Calf Pain
    "calf pain": "SX_CALF_PAIN",
    "pain in calves": "SX_CALF_PAIN",
    "sakit ng binti": "SX_CALF_PAIN",
    "masakit ang binti": "SX_CALF_PAIN",
    "ngalay ang binti": "SX_CALF_PAIN",
    # Leptospirosis - Oliguria
    "urine stopped": "SX_OLIGURIA",
    "can't pee": "SX_OLIGURIA",
    "hindi makaihi": "SX_OLIGURIA",
    "walang ihi": "SX_OLIGURIA",
    "konti ang ihi": "SX_OLIGURIA",
    # Malaria - Rigors/Pallor
    "shaking chills": "SX_RIGORS",
    "violent shaking": "SX_RIGORS",
    "nanginginig sa ginaw": "SX_RIGORS",
    "pale": "SX_PALLOR",
    "pallor": "SX_PALLOR",
    "namumutla": "SX_PALLOR",
    "maputla": "SX_PALLOR",
    # Meningococcemia - Stiff Neck/Purpura
    "stiff neck": "SX_NECK_STIFFNESS",
    "neck stiffness": "SX_NECK_STIFFNESS",
    "matigas ang leeg": "SX_NECK_STIFFNESS",
    "purple spots": "SX_PURPURA",
    "purple rash": "SX_PURPURA",
    "pasa-pasa": "SX_PURPURA",  # Bruise-like
    # F2. Diarrhea Confounders (Cancer, Amoebiasis)
    # Colorectal Cancer
    "pencil thin stool": "SX_PENCIL_STOOL",
    "thin stool": "SX_PENCIL_STOOL",
    "duming parang lapis": "SX_PENCIL_STOOL",
    "manipis na dumi": "SX_PENCIL_STOOL",
    "urge to poop but nothing": "SX_TENESMUS",
    "parang natatae pero wala": "SX_TENESMUS",
    # Amoebiasis
    "raspberry jelly": "SX_RASPBERRY_STOOL",
    "bloody mucus": "SX_RASPBERRY_STOOL",
    "jelly stool": "SX_RASPBERRY_STOOL",
    "madugo at madulas": "SX_RASPBERRY_STOOL",
    # F3. Measles Confounders (Kawasaki, Rubella)
    # Kawasaki Disease
    "strawberry tongue": "SX_STRAWBERRY_TONGUE",
    "red tongue": "SX_STRAWBERRY_TONGUE",
    "peeling skin": "SX_PEELING_SKIN",
    "nagbabalat": "SX_PEELING_SKIN",
    "peeling hands": "SX_PEELING_SKIN",
    "fever for 5 days": "SX_PROLONGED_FEVER",
    "matagal na lagnat": "SX_PROLONGED_FEVER",
    # Rubella
    "lump behind ear": "SX_POST_AURICULAR_LYMPHADENOPATHY",
    "swollen behind ear": "SX_POST_AURICULAR_LYMPHADENOPATHY",
    "bukol sa likod ng tenga": "SX_POST_AURICULAR_LYMPHADENOPATHY",
    # F4. Pneumonia Confounders (TB, Heart Failure, Asthma)
    # Tuberculosis
    "coughing blood": "SX_HEMOPTYSIS",
    "blood in phlegm": "SX_HEMOPTYSIS",
    "umuubo ng dugo": "SX_HEMOPTYSIS",
    "may dugo ang plema": "SX_HEMOPTYSIS",
    "night sweats": "SX_NIGHT_SWEATS",
    "sweating at night": "SX_NIGHT_SWEATS",
    "pinapawisan sa gabi": "SX_NIGHT_SWEATS",
    "cough for 2 weeks": "SX_CHRONIC_COUGH",
    "tagal na ng ubo": "SX_CHRONIC_COUGH",
    "2 linggo na ubo": "SX_CHRONIC_COUGH",
    # Heart Failure
    "can't lie flat": "SX_ORTHOPNEA",
    "needs pillows to sleep": "SX_ORTHOPNEA",
    "hindi makahiga": "SX_ORTHOPNEA",
    "hirap huminga pag nakahiga": "SX_ORTHOPNEA",
    "pink froth": "SX_PINK_FROTHY_SPUTUM",
    "pink phlegm": "SX_PINK_FROTHY_SPUTUM",
    "kulay rosas na plema": "SX_PINK_FROTHY_SPUTUM",
    # Asthma
    "wheezing": "SX_WHEEZING",
    "whistling breath": "SX_WHEEZING",
    "humuhuni": "SX_WHEEZING",
    "huni": "SX_WHEEZING",
    # NEW: Formal Medical Red Flags (From Research)
    # Dengue
    "tuloy-tuloy na pagsusuka": "SX_PERSISTENT_VOMITING",
    "pagdurugo sa ilong": "SX_HEMORRHAGE",
    "pagdurugo ng gilagid": "SX_HEMORRHAGE",
    "pain behind the eyes": "SX_RETROORBITAL_PAIN",
    "pain behind my eyes": "SX_RETROORBITAL_PAIN",
    "pain behind your eyes": "SX_RETROORBITAL_PAIN",
    "behind your eyes": "SX_RETROORBITAL_PAIN",
    "sa likod ng iyong mga mata": "SX_RETROORBITAL_PAIN",
    "sa likod ng aking mga mata": "SX_RETROORBITAL_PAIN",
    "sa likod ng mga mata": "SX_RETROORBITAL_PAIN",
    "pananakit sa likod ng mga mata": "SX_RETROORBITAL_PAIN",
    "sakit sa likod ng mata": "SX_RETROORBITAL_PAIN",
    "likod ng mata": "SX_RETROORBITAL_PAIN",
    "petechiae": "SX_PETECHIAE",
    # Typhoid Fever (Tipus)
    "rose spots sa tiyan": "SX_ROSE_SPOTS",
    "matinding sakit sa tiyan": "SX_SEVERE_ABDOMINAL_PAIN",
    "itim na dumi": "SX_MELENA",
    "pagkalito": "SX_ALTERED_MENTAL_STATUS",
    # Cholera
    "matubig na pagtatae": "SX_RICE_WATER_STOOL",
    "matinding pagkatuyo": "SX_SEVERE_DEHYDRATION",
    # Malaria
    "stepladder fever": "SX_STEPLADDER_FEVER",
    "matinding panginginig": "SX_RIGORS_AND_DIAPHORESIS",
    # Leptospirosis
    "pamumula ng mata": "SX_CONJUNCTIVAL_SUFFUSION",
    "pananakit ng binti": "SX_CALF_MYALGIA",
    # Tuberculosis (PTB)
    "lagnat sa hapon": "SX_AFTERNOON_EVENING_FEVER",
    "lagnat sa gabi": "SX_AFTERNOON_EVENING_FEVER",
    "dugo sa plema": "SX_HEMOPTYSIS",
    # Measles (Tigdas)
    "koplick spots": "SX_KOPLIK_SPOTS",
    "mapupulang pantal": "SX_MACULOPAPULAR_RASH",
    # Pneumonia (Pulmonya)
    "greenish rusty sputum": "SX_RUSTY_SPUTUM",
    "sakit sa dibdib pag humihinga": "SX_PLEURITIC_CHEST_PAIN",
    "paglubog ng tiyan": "SX_CHEST_INDRAWING",
    # NEW: Specific Long-Form Synthetic Mappings (From NotebookLM AI Prompts)
    "anim na beses na lbm ko since morning": "SX_ACUTE_DIARRHEA_HIGH_FREQUENCY",
    "walong beses na akong pabalik-balik sa cr": "SX_ACUTE_DIARRHEA_HIGH_FREQUENCY",
    "ang dumi ko ay sobrang tubig, parang tubig lang talaga": "SX_WATERY_STOOL",
    "may dugo sa dumi ko": "SX_BLOODY_STOOL",
    "may kasamang kulay sipon yung dumi ko": "SX_MUCOID_STOOL",
    "mataas ang lagnat ko tapos giniginaw ako": "SX_FEVER_AND_CHILLS",
    "ang bigat ng pakiramdam ko, bawat galaw masakit": "SX_SEVERE_MYALGIA",
    "wala akong lakas kahit bumangon sa kama": "SX_SEVERE_FATIGUE",
    "may kasamang tuyong ubo na walang plema": "SX_DRY_COUGH",
    "makati ang lalamunan ko at sinisipon": "SX_SORE_THROAT_AND_CORYZA",
    "umuubo ako nang may makapal na plema na kulay berde": "SX_PRODUCTIVE_COUGH_GREEN_SPUTUM",
    "parang pinipiga yung dibdib ko sa bawat paghinga": "SX_PLEURITIC_CHEST_PAIN",
    "hinihingal ako agad kahit konting galaw lang": "SX_DYSPNEA_ON_EXERTION",
    "nagsimula yung pantal sa likod ng tenga ko tapos ngayon pababa na sa leeg at dibdib": "SX_DESCENDING_RASH",
    "sobrang pula ng mata ko at nagluluha, nasisilaw ako sa liwanag": "SX_CONJUNCTIVITIS_AND_PHOTOPHOBIA",
    "may napansin akong maliliit na puting butlig sa loob ng pisngi ko bago pa lumabas yung pantal": "SX_KOPLIK_SPOTS",
    # --- OUT-OF-SCOPE DISEASE DIFFERENTIATORS ---
    # These concepts indicate conditions outside the 6 in-scope diseases.
    # Reference: docs/out-of-scope-diseases.md
    # Chikungunya differentiators
    "persistent joint pain": "SX_PERSISTENT_POLYARTHRALGIA",
    "joint pain for weeks": "SX_PERSISTENT_POLYARTHRALGIA",
    "joint pain for months": "SX_PERSISTENT_POLYARTHRALGIA",
    "matagal na pananakit ng kasukasuan": "SX_PERSISTENT_POLYARTHRALGIA",
    "symmetric joint": "SX_SYMMETRIC_JOINT_INVOLVEMENT",
    "both knees": "SX_SYMMETRIC_JOINT_INVOLVEMENT",
    "both wrists": "SX_SYMMETRIC_JOINT_INVOLVEMENT",
    "parehong tuhod": "SX_SYMMETRIC_JOINT_INVOLVEMENT",
    # Malaria differentiators
    "cyclical fever": "SX_CYCLICAL_FEVER",
    "fever every other day": "SX_CYCLICAL_FEVER",
    "fever every 3 days": "SX_CYCLICAL_FEVER",
    "lagnat tuwing ibang araw": "SX_CYCLICAL_FEVER",
    "traveled to": "RISK_MALARIA_ENDEMIC_TRAVEL",
    "came from africa": "RISK_MALARIA_ENDEMIC_TRAVEL",
    "galing sa probinsya": "RISK_MALARIA_ENDEMIC_TRAVEL",
    # Leptospirosis additional (base already exists)
    "waded through flood": "RISK_FLOOD_EXPOSURE",
    "naglakad sa baha": "RISK_FLOOD_EXPOSURE",
    # Zika differentiators
    "mild fever": "SX_MILD_FEVER",
    "low grade fever": "SX_MILD_FEVER",
    "hindi gaanong mataas ang lagnat": "SX_MILD_FEVER",
    "pink eye": "SX_PROMINENT_CONJUNCTIVITIS",
    "conjunctivitis": "SX_PROMINENT_CONJUNCTIVITIS",
    "namumula ang mata": "SX_PROMINENT_CONJUNCTIVITIS",
    # COVID-19 additional (base already exists for anosmia/ageusia)
    "oxygen low but breathing ok": "SX_SILENT_HYPOXIA",
    "low oxygen no shortness of breath": "SX_SILENT_HYPOXIA",
    "happy hypoxia": "SX_SILENT_HYPOXIA",
    # Brucellosis differentiators
    "undulating fever": "SX_UNDULATING_FEVER",
    "wave-like fever": "SX_UNDULATING_FEVER",
    "drenching sweats": "SX_DRENCHING_SWEATS",
    "soaking wet": "SX_DRENCHING_SWEATS",
    "basa sa pawis": "SX_DRENCHING_SWEATS",
    "lower back pain": "SX_SACROILIITIS",
    "sacroiliac": "SX_SACROILIITIS",
    "sakit ng lower back": "SX_SACROILIITIS",
    "animal contact": "RISK_ANIMAL_DAIRY_EXPOSURE",
    "unpasteurized milk": "RISK_ANIMAL_DAIRY_EXPOSURE",
    "farm animal": "RISK_ANIMAL_DAIRY_EXPOSURE",
    "galing sa hayop": "RISK_ANIMAL_DAIRY_EXPOSURE",
    # Scrub Typhus differentiators
    "eschar": "SX_ESCHAR",
    "black scab": "SX_ESCHAR",
    "bite mark": "SX_ESCHAR",
    "itim na sugat": "SX_ESCHAR",
    "swollen glands": "SX_REGIONAL_LYMPHADENOPATHY",
    "namamagang kulani": "SX_REGIONAL_LYMPHADENOPATHY",
    "went hiking": "RISK_OUTDOOR_RURAL_EXPOSURE",
    "camping": "RISK_OUTDOOR_RURAL_EXPOSURE",
    "nagtrabaho sa bukid": "RISK_OUTDOOR_RURAL_EXPOSURE",
    # Infectious Mononucleosis differentiators
    "white patches throat": "SX_EXUDATIVE_PHARYNGITIS",
    "pus on tonsils": "SX_EXUDATIVE_PHARYNGITIS",
    "may puti sa lalamunan": "SX_EXUDATIVE_PHARYNGITIS",
    "swollen spleen": "SX_SPLENOMEGALY",
    "enlarged spleen": "SX_SPLENOMEGALY",
    "namamagang pali": "SX_SPLENOMEGALY",
    # RSV/hMPV differentiators
    "bronchiolitis": "SX_BRONCHIOLITIS",
    "chest congestion baby": "SX_BRONCHIOLITIS",
    "infant": "RISK_INFANT_ELDERLY",
    "sanggol": "RISK_INFANT_ELDERLY",
    "elderly": "RISK_INFANT_ELDERLY",
    "matanda": "RISK_INFANT_ELDERLY",
    # Parainfluenza differentiators
    "croup": "SX_CROUP",
    "barking cough": "SX_BARKING_COUGH",
    "seal-like cough": "SX_BARKING_COUGH",
    "ubo na parang aso": "SX_BARKING_COUGH",
    "stridor": "SX_STRIDOR",
    "noisy breathing": "SX_STRIDOR",
    "maingay na paghinga": "SX_STRIDOR",
    "child": "RISK_PEDIATRIC",
    "toddler": "RISK_PEDIATRIC",
    "bata": "RISK_PEDIATRIC",
    # Roseola differentiator (pathognomonic)
    "rash appeared after fever went away": "SX_RASH_AFTER_FEVER_RESOLVES",
    "rash after fever broke": "SX_RASH_AFTER_FEVER_RESOLVES",
    "lumabas ang pantal pagkatapos mawala ang lagnat": "SX_RASH_AFTER_FEVER_RESOLVES",
    "6 months old": "RISK_INFANT_6_24_MONTHS",
    "1 year old": "RISK_INFANT_6_24_MONTHS",
    "anim na buwan": "RISK_INFANT_6_24_MONTHS",
    # Kawasaki additional (strawberry tongue, peeling skin already exist)
    "high crp": "LAB_ELEVATED_CRP",
    "elevated crp": "LAB_ELEVATED_CRP",
    "mataas ang crp": "LAB_ELEVATED_CRP",
    # Scarlet Fever differentiators
    "sandpaper rash": "SX_SANDPAPER_RASH",
    "rough rash": "SX_SANDPAPER_RASH",
    "parang papel de liha": "SX_SANDPAPER_RASH",
    "white around mouth": "SX_CIRCUMORAL_PALLOR",
    "pale around lips": "SX_CIRCUMORAL_PALLOR",
    "puti sa paligid ng bibig": "SX_CIRCUMORAL_PALLOR",
    "red lines in skin folds": "SX_PASTIA_LINES",
    "pastia lines": "SX_PASTIA_LINES",
    # Fifth Disease differentiators
    "slapped cheek": "SX_SLAPPED_CHEEK_RASH",
    "red cheeks": "SX_SLAPPED_CHEEK_RASH",
    "parang sinampal": "SX_SLAPPED_CHEEK_RASH",
    "lacy rash": "SX_LACY_RETICULAR_RASH",
    "net-like rash": "SX_LACY_RETICULAR_RASH",
    "parang lambat ang pantal": "SX_LACY_RETICULAR_RASH",
    # TB additional (chronic cough, night sweats, hemoptysis already exist)
    "tb contact": "RISK_TB_EXPOSURE",
    "tb exposure": "RISK_TB_EXPOSURE",
    "nakasalamuha ng may tb": "RISK_TB_EXPOSURE",
    # Pertussis differentiators
    "coughing fits": "SX_PAROXYSMAL_COUGH",
    "paroxysmal cough": "SX_PAROXYSMAL_COUGH",
    "sunod-sunod na ubo": "SX_PAROXYSMAL_COUGH",
    "whoop sound": "SX_INSPIRATORY_WHOOP",
    "whooping cough": "SX_INSPIRATORY_WHOOP",
    "tunog na whoop": "SX_INSPIRATORY_WHOOP",
    "vomiting after cough": "SX_POST_TUSSIVE_VOMITING",
    "sinusuka pagkatapos umubo": "SX_POST_TUSSIVE_VOMITING",
    # Mycoplasma differentiators
    "walking pneumonia": "SX_WALKING_PNEUMONIA",
    "mild pneumonia": "SX_WALKING_PNEUMONIA",
    "ear pain with pneumonia": "SX_BULLOUS_MYRINGITIS",
    "masakit ang tenga": "SX_BULLOUS_MYRINGITIS",
    # Legionella differentiators
    "diarrhea with pneumonia": "SX_GI_SYMPTOMS_WITH_PNEUMONIA",
    "pneumonia with stomach problems": "SX_GI_SYMPTOMS_WITH_PNEUMONIA",
    "low sodium": "SX_HYPONATREMIA",
    "hyponatremia": "SX_HYPONATREMIA",
    "confusion with pneumonia": "SX_ENCEPHALOPATHY",
    "disoriented": "SX_ENCEPHALOPATHY",
    "nalilito": "SX_ENCEPHALOPATHY",
    # Pulmonary Embolism differentiators
    "sudden shortness of breath": "SX_SUDDEN_ONSET_DYSPNEA",
    "biglang nahirapan huminga": "SX_SUDDEN_ONSET_DYSPNEA",
    "leg swelling": "RISK_DVT_FACTORS",
    "recent surgery": "RISK_DVT_FACTORS",
    "long flight": "RISK_DVT_FACTORS",
    "bed rest": "RISK_DVT_FACTORS",
    "namamagang binti": "RISK_DVT_FACTORS",
    "oxygen low despite treatment": "SX_DISPROPORTIONATE_HYPOXIA",
    # Cholera differentiators (rice water stool already exists)
    "losing liters of fluid": "SX_MASSIVE_FLUID_LOSS",
    "constant watery stool": "SX_MASSIVE_FLUID_LOSS",
    "walang tigil na pagtatae": "SX_MASSIVE_FLUID_LOSS",
    # Campylobacter differentiators
    "ate chicken": "RISK_POULTRY_EXPOSURE",
    "undercooked chicken": "RISK_POULTRY_EXPOSURE",
    "kumain ng manok": "RISK_POULTRY_EXPOSURE",
    "severe abdominal cramps": "SX_SEVERE_CRAMPING",
    "matinding pulikat sa tiyan": "SX_SEVERE_CRAMPING",
    # Rotavirus differentiators
    "vomiting then diarrhea": "SX_VOMITING_BEFORE_DIARRHEA",
    "nagsuka muna bago nagtatae": "SX_VOMITING_BEFORE_DIARRHEA",
    "baby": "RISK_INFANT_TODDLER",
    "2 years old": "RISK_INFANT_TODDLER",
    "winter": "RISK_WINTER_SEASON",
    "taglamig": "RISK_WINTER_SEASON",
    # Norovirus differentiators
    "cruise ship": "RISK_OUTBREAK_SETTING",
    "school outbreak": "RISK_OUTBREAK_SETTING",
    "everyone got sick": "RISK_OUTBREAK_SETTING",
    "marami ang nagkasakit": "RISK_OUTBREAK_SETTING",
    "sudden vomiting and diarrhea": "SX_SUDDEN_ONSET",
    "biglang nagsuka at nagtatae": "SX_SUDDEN_ONSET",
    "projectile vomiting": "SX_PROMINENT_VOMITING",
    "constant vomiting": "SX_PROMINENT_VOMITING",
    "walang tigil na pagsusuka": "SX_PROMINENT_VOMITING",
    # IBD differentiators
    "on and off diarrhea": "SX_CHRONIC_RELAPSING_DIARRHEA",
    "chronic diarrhea": "SX_CHRONIC_RELAPSING_DIARRHEA",
    "matagal na pagtatae": "SX_CHRONIC_RELAPSING_DIARRHEA",
    "joint pain with diarrhea": "SX_EXTRAINTESTINAL_MANIFESTATIONS",
    "skin problems with diarrhea": "SX_EXTRAINTESTINAL_MANIFESTATIONS",
    "may arthritis din": "SX_EXTRAINTESTINAL_MANIFESTATIONS",
    # Rubella differentiator (adult arthralgia with mild fever)
    "joint pain with mild rash": "SX_ADULT_ARTHRALGIA",
    "arthralgia with rash": "SX_ADULT_ARTHRALGIA",
    "masakit ang kasukasuan kasama ng pantal": "SX_ADULT_ARTHRALGIA",
}

# --- TIER 2: High-Value Concepts for Verification ---
# Concepts that MUST be explained by the predicted disease ontology.
# If these are found in input but NOT in the disease profile, flag OUT_OF_SCOPE.
#
# NOTE: Removed concepts that overlap with in-scope disease symptoms:
# - SX_MILD_FEVER (Diarrhea has mild fever)
# - SX_SUDDEN_ONSET (Influenza has sudden onset)
# - SX_DRY_COUGH (Influenza, Measles have dry cough)
# - SX_BLOODY_STOOL (Diarrhea can have blood)
# - SX_PROLONGED_FEVER (Typhoid has prolonged fever)
# - SX_PLEURITIC_CHEST_PAIN (Pneumonia has chest pain)
# - SX_SEVERE_DEHYDRATION (Diarrhea has dehydration)
HIGH_VALUE_CONCEPTS = {
    "RISK_FLOOD_EXPOSURE",
    "RISK_RODENT_EXPOSURE",
    "RISK_CONTAMINATED_WATER",
    "SX_AGEUSIA",
    "SX_ANOSMIA",
    "SX_JAUNDICE",
    "SX_DARK_URINE",
    "SX_CONJUNCTIVAL_SUFFUSION",
    "SX_POLYURIA",
    "SX_POLYDIPSIA",
    "SX_POLYPHAGIA",
    "SX_WEIGHT_LOSS",
    "SX_SLOW_HEALING",
    "SX_NEUROPATHY",
    "SX_BLURRED_VISION",
    # PH Red Flags
    "SX_CALF_PAIN",
    "SX_OLIGURIA",
    "SX_RIGORS",
    "SX_PALLOR",
    "SX_NECK_STIFFNESS",
    "SX_PURPURA",
    "SX_PENCIL_STOOL",
    "SX_TENESMUS",
    "SX_RASPBERRY_STOOL",
    "SX_STRAWBERRY_TONGUE",
    "SX_PEELING_SKIN",
    # REMOVED: SX_PROLONGED_FEVER (Typhoid has prolonged fever)
    "SX_POST_AURICULAR_LYMPHADENOPATHY",
    "SX_HEMOPTYSIS",
    "SX_NIGHT_SWEATS",
    "SX_CHRONIC_COUGH",
    "SX_ORTHOPNEA",
    "SX_PINK_FROTHY_SPUTUM",
    "SX_WHEEZING",
    # Formal Medical Red Flags
    "SX_PERSISTENT_VOMITING",
    "SX_HEMORRHAGE",
    "SX_RETROORBITAL_PAIN",
    "SX_PETECHIAE",
    "SX_ROSE_SPOTS",
    "SX_SEVERE_ABDOMINAL_PAIN",
    "SX_MELENA",
    "SX_ALTERED_MENTAL_STATUS",
    "SX_RICE_WATER_STOOL",
    # REMOVED: SX_SEVERE_DEHYDRATION (Diarrhea has dehydration)
    "SX_STEPLADDER_FEVER",
    "SX_RIGORS_AND_DIAPHORESIS",
    "SX_CALF_MYALGIA",
    "SX_AFTERNOON_EVENING_FEVER",
    "SX_KOPLIK_SPOTS",
    "SX_MACULOPAPULAR_RASH",
    "SX_RUSTY_SPUTUM",
    # REMOVED: SX_PLEURITIC_CHEST_PAIN (Pneumonia has chest pain)
    "SX_CHEST_INDRAWING",
    # Specific Synthetic NotebookLM Concepts
    "SX_ACUTE_DIARRHEA_HIGH_FREQUENCY",
    "SX_WATERY_STOOL",
    # REMOVED: SX_BLOODY_STOOL (Diarrhea can have blood)
    "SX_MUCOID_STOOL",
    "SX_FEVER_AND_CHILLS",
    "SX_SEVERE_MYALGIA",
    "SX_SEVERE_FATIGUE",
    # REMOVED: SX_DRY_COUGH (Influenza, Measles have dry cough)
    "SX_SORE_THROAT_AND_CORYZA",
    "SX_PRODUCTIVE_COUGH_GREEN_SPUTUM",
    "SX_DYSPNEA_ON_EXERTION",
    "SX_DESCENDING_RASH",
    "SX_CONJUNCTIVITIS_AND_PHOTOPHOBIA",
    # --- OUT-OF-SCOPE DISEASE DIFFERENTIATORS ---
    # Chikungunya
    "SX_PERSISTENT_POLYARTHRALGIA",
    "SX_SYMMETRIC_JOINT_INVOLVEMENT",
    # Malaria
    "SX_CYCLICAL_FEVER",
    "RISK_MALARIA_ENDEMIC_TRAVEL",
    # Zika
    # REMOVED: SX_MILD_FEVER (Diarrhea has mild fever)
    "SX_PROMINENT_CONJUNCTIVITIS",
    # COVID-19
    "SX_SILENT_HYPOXIA",
    # Brucellosis
    "SX_UNDULATING_FEVER",
    "SX_DRENCHING_SWEATS",
    "SX_SACROILIITIS",
    "RISK_ANIMAL_DAIRY_EXPOSURE",
    # Scrub Typhus
    "SX_ESCHAR",
    "SX_REGIONAL_LYMPHADENOPATHY",
    "RISK_OUTDOOR_RURAL_EXPOSURE",
    # Infectious Mononucleosis
    "SX_EXUDATIVE_PHARYNGITIS",
    "SX_SPLENOMEGALY",
    # RSV/hMPV
    "SX_BRONCHIOLITIS",
    "RISK_INFANT_ELDERLY",
    # Parainfluenza
    "SX_CROUP",
    "SX_BARKING_COUGH",
    "SX_STRIDOR",
    "RISK_PEDIATRIC",
    # Roseola (pathognomonic)
    "SX_RASH_AFTER_FEVER_RESOLVES",
    "RISK_INFANT_6_24_MONTHS",
    # Kawasaki
    "LAB_ELEVATED_CRP",
    # Scarlet Fever
    "SX_SANDPAPER_RASH",
    "SX_CIRCUMORAL_PALLOR",
    "SX_PASTIA_LINES",
    # Fifth Disease
    "SX_SLAPPED_CHEEK_RASH",
    "SX_LACY_RETICULAR_RASH",
    # TB
    "RISK_TB_EXPOSURE",
    # Pertussis
    "SX_PAROXYSMAL_COUGH",
    "SX_INSPIRATORY_WHOOP",
    "SX_POST_TUSSIVE_VOMITING",
    # Mycoplasma
    "SX_WALKING_PNEUMONIA",
    "SX_BULLOUS_MYRINGITIS",
    # Legionella
    "SX_GI_SYMPTOMS_WITH_PNEUMONIA",
    "SX_HYPONATREMIA",
    "SX_ENCEPHALOPATHY",
    # Pulmonary Embolism
    "SX_SUDDEN_ONSET_DYSPNEA",
    "RISK_DVT_FACTORS",
    "SX_DISPROPORTIONATE_HYPOXIA",
    # Cholera
    "SX_MASSIVE_FLUID_LOSS",
    # Campylobacter
    "RISK_POULTRY_EXPOSURE",
    "SX_SEVERE_CRAMPING",
    # Rotavirus
    "SX_VOMITING_BEFORE_DIARRHEA",
    "RISK_INFANT_TODDLER",
    "RISK_WINTER_SEASON",
    # Norovirus
    "RISK_OUTBREAK_SETTING",
    # REMOVED: SX_SUDDEN_ONSET (Influenza has sudden onset)
    "SX_PROMINENT_VOMITING",
    # IBD
    "SX_CHRONIC_RELAPSING_DIARRHEA",
    "SX_EXTRAINTESTINAL_MANIFESTATIONS",
    # Rubella
    "SX_ADULT_ARTHRALGIA",
}

# =============================================================================
# TIER 3: Unrelated Category Concepts
# =============================================================================
#
# Symptoms that indicate completely different medical categories requiring
# immediate referral. These are NOT within the infectious disease diagnostic
# scope of this system. Uses SPECIFIC variants to avoid false positives
# (e.g., "crushing chest pain radiating to arm" instead of general "chest pain").
#
# When any Tier 3 concept is detected, the system should:
# 1. NOT attempt ML diagnosis
# 2. Provide appropriate referral message
# 3. Direct user to seek appropriate medical care
#
# Categories:
# - STI_GENITOURINARY: Sexually transmitted infections, urinary/genital issues
# - CARDIOVASCULAR: Heart and vascular emergencies
# - NEUROLOGICAL: Brain, nerve, and spinal cord issues
# - ENDOCRINE: Hormonal and metabolic disorders
# - MUSCULOSKELETAL: Non-infectious bone/joint/muscle issues
# - MENTAL_HEALTH: Psychiatric conditions
# - DERMATOLOGICAL: Non-infectious chronic skin conditions
# =============================================================================

UNRELATED_CATEGORY_CONCEPTS = {
    # --- STI/GENITOURINARY CATEGORY ---
    # Genital discharge (SX_GENITAL_DISCHARGE)
    "genital discharge": "SX_GENITAL_DISCHARGE",
    "vaginal discharge": "SX_GENITAL_DISCHARGE",
    "penile discharge": "SX_GENITAL_DISCHARGE",
    "discharge from penis": "SX_GENITAL_DISCHARGE",
    "discharge from vagina": "SX_GENITAL_DISCHARGE",
    "may lumalabas sa ari": "SX_GENITAL_DISCHARGE",
    "may labas sa ari": "SX_GENITAL_DISCHARGE",
    "may discharge sa ari": "SX_GENITAL_DISCHARGE",
    "mabahong discharge sa ari": "SX_GENITAL_DISCHARGE",
    "discharge sa ari": "SX_GENITAL_DISCHARGE",
    "yellowish discharge": "SX_GENITAL_DISCHARGE",
    # Dysuria / burning urination (SX_DYSURIA)
    "burning urination": "SX_DYSURIA",
    "painful urination": "SX_DYSURIA",
    "burns when i pee": "SX_DYSURIA",
    "hurts to urinate": "SX_DYSURIA",
    "mahapdi umihi": "SX_DYSURIA",
    "masakit umihi": "SX_DYSURIA",
    "sumasakit pag umihi": "SX_DYSURIA",
    "mahapdi ang pag-ihi": "SX_DYSURIA",
    "mahapdi kapag umiihi": "SX_DYSURIA",
    "burning sensation": "SX_DYSURIA",
    # Genital ulcers/sores (SX_GENITAL_ULCER)
    "genital ulcer": "SX_GENITAL_ULCER",
    "genital sore": "SX_GENITAL_ULCER",
    "sore on genitals": "SX_GENITAL_ULCER",
    "ulcer on penis": "SX_GENITAL_ULCER",
    "ulcer on vagina": "SX_GENITAL_ULCER",
    "sugat sa ari": "SX_GENITAL_ULCER",
    "singaw sa ari": "SX_GENITAL_ULCER",
    "may sugat sa pribadong parte": "SX_GENITAL_ULCER",
    # Pelvic pain (SX_PELVIC_PAIN)
    "pelvic pain": "SX_PELVIC_PAIN",
    "pain in pelvis": "SX_PELVIC_PAIN",
    "lower abdominal pain with discharge": "SX_PELVIC_PAIN",
    "sakit ng puson": "SX_PELVIC_PAIN",
    "masakit ang puson": "SX_PELVIC_PAIN",
    "pananakit ng puson": "SX_PELVIC_PAIN",
    # --- CARDIOVASCULAR CATEGORY ---
    # Crushing/radiating chest pain (SX_CARDIAC_CHEST_PAIN)
    # NOTE: Using specific descriptors to avoid false positives with pneumonia
    "crushing chest pain": "SX_CARDIAC_CHEST_PAIN",
    "chest pain radiating to arm": "SX_CARDIAC_CHEST_PAIN",
    "chest pain radiating to jaw": "SX_CARDIAC_CHEST_PAIN",
    "pressure in chest": "SX_CARDIAC_CHEST_PAIN",
    "elephant sitting on chest": "SX_CARDIAC_CHEST_PAIN",
    "tightness in chest radiating": "SX_CARDIAC_CHEST_PAIN",
    "parang may nakadagan sa dibdib": "SX_CARDIAC_CHEST_PAIN",
    "parang nababanat ang dibdib": "SX_CARDIAC_CHEST_PAIN",
    "sakit ng dibdib hanggang braso": "SX_CARDIAC_CHEST_PAIN",
    "sakit ng dibdib hanggang panga": "SX_CARDIAC_CHEST_PAIN",
    # Peripheral edema (SX_PERIPHERAL_EDEMA)
    "swollen ankles": "SX_PERIPHERAL_EDEMA",
    "swollen feet": "SX_PERIPHERAL_EDEMA",
    "leg swelling both sides": "SX_PERIPHERAL_EDEMA",
    "pitting edema": "SX_PERIPHERAL_EDEMA",
    "namamagang paa": "SX_PERIPHERAL_EDEMA",
    "namamaga ang mga paa": "SX_PERIPHERAL_EDEMA",
    "namamagang bukong-bukong": "SX_PERIPHERAL_EDEMA",
    # Palpitations with syncope (SX_PALPITATIONS_SYNCOPE)
    "palpitations then fainted": "SX_PALPITATIONS_SYNCOPE",
    "heart racing and passed out": "SX_PALPITATIONS_SYNCOPE",
    "irregular heartbeat with dizziness": "SX_PALPITATIONS_SYNCOPE",
    "mabilis ang tibok tapos nahilo": "SX_PALPITATIONS_SYNCOPE",
    "kumakabog tapos hinimatay": "SX_PALPITATIONS_SYNCOPE",
    "hindi regular ang tibok ng puso": "SX_PALPITATIONS_SYNCOPE",
    # --- NEUROLOGICAL CATEGORY ---
    # Focal weakness (SX_FOCAL_WEAKNESS)
    "weakness on one side": "SX_FOCAL_WEAKNESS",
    "one arm weak": "SX_FOCAL_WEAKNESS",
    "one leg weak": "SX_FOCAL_WEAKNESS",
    "half body weak": "SX_FOCAL_WEAKNESS",
    "face drooping": "SX_FOCAL_WEAKNESS",
    "mahina ang isang bahagi ng katawan": "SX_FOCAL_WEAKNESS",
    "mahina ang isang braso": "SX_FOCAL_WEAKNESS",
    "mahina ang isang binti": "SX_FOCAL_WEAKNESS",
    "nakaluhod ang mukha": "SX_FOCAL_WEAKNESS",
    "bagsak ang isang pisngi": "SX_FOCAL_WEAKNESS",
    # Seizure (SX_SEIZURE)
    "seizure": "SX_SEIZURE",
    "convulsion": "SX_SEIZURE",
    "had a fit": "SX_SEIZURE",
    "shaking uncontrollably": "SX_SEIZURE",
    "kombulsyon": "SX_SEIZURE",
    "nagkokombulsyon": "SX_SEIZURE",
    "pangingisay": "SX_SEIZURE",
    "nangingisay": "SX_SEIZURE",
    "atake": "SX_SEIZURE",
    # Thunderclap headache (SX_THUNDERCLAP_HEADACHE)
    "worst headache of my life": "SX_THUNDERCLAP_HEADACHE",
    "sudden severe headache": "SX_THUNDERCLAP_HEADACHE",
    "thunderclap headache": "SX_THUNDERCLAP_HEADACHE",
    "headache came suddenly and severe": "SX_THUNDERCLAP_HEADACHE",
    "biglaang matinding sakit ng ulo": "SX_THUNDERCLAP_HEADACHE",
    "parang sumabog ang ulo ko": "SX_THUNDERCLAP_HEADACHE",
    "pinakamatinding sakit ng ulo": "SX_THUNDERCLAP_HEADACHE",
    # Slurred speech (SX_SLURRED_SPEECH)
    "slurred speech": "SX_SLURRED_SPEECH",
    "speech is slurred": "SX_SLURRED_SPEECH",
    "talking funny": "SX_SLURRED_SPEECH",
    "words not coming out right": "SX_SLURRED_SPEECH",
    "pautal-utal": "SX_SLURRED_SPEECH",
    "hindi malinaw magsalita": "SX_SLURRED_SPEECH",
    "parang lasing magsalita": "SX_SLURRED_SPEECH",
    "nabubulunan sa salita": "SX_SLURRED_SPEECH",
    # --- ENDOCRINE CATEGORY ---
    # Diabetes triad: polyuria + polydipsia + polyphagia (SX_DIABETES_TRIAD)
    "always thirsty always peeing always hungry": "SX_DIABETES_TRIAD",
    "thirsty hungry urinating a lot": "SX_DIABETES_TRIAD",
    "the 3 Ps": "SX_DIABETES_TRIAD",
    "laging nauuhaw laging kumakain laging umiihi": "SX_DIABETES_TRIAD",
    "sobrang uhaw sobrang gutom madalas umihi": "SX_DIABETES_TRIAD",
    "parang walang tigil uminom kain at ihi": "SX_DIABETES_TRIAD",
    # Goiter (SX_GOITER)
    "neck swelling thyroid": "SX_GOITER",
    "goiter": "SX_GOITER",
    "swelling in front of neck": "SX_GOITER",
    "enlarged thyroid": "SX_GOITER",
    "bosyo": "SX_GOITER",
    "bukol sa leeg": "SX_GOITER",
    "namamagang leeg sa harap": "SX_GOITER",
    "lumaki ang thyroid": "SX_GOITER",
    # --- MUSCULOSKELETAL (NON-INFECTIOUS) CATEGORY ---
    # Chronic arthritis without fever (SX_CHRONIC_ARTHRITIS)
    "joint pain for months": "SX_CHRONIC_ARTHRITIS",
    "arthritis no fever": "SX_CHRONIC_ARTHRITIS",
    "chronic joint pain": "SX_CHRONIC_ARTHRITIS",
    "rheumatoid arthritis": "SX_CHRONIC_ARTHRITIS",
    "osteoarthritis": "SX_CHRONIC_ARTHRITIS",
    "rayuma": "SX_CHRONIC_ARTHRITIS",
    "matagal nang masakit ang kasukasuan": "SX_CHRONIC_ARTHRITIS",
    "pananakit ng kasukasuan na matagal na": "SX_CHRONIC_ARTHRITIS",
    "arthritis pero walang lagnat": "SX_CHRONIC_ARTHRITIS",
    # Trauma (SX_TRAUMA)
    "fell and hurt": "SX_TRAUMA",
    "accident injury": "SX_TRAUMA",
    "hit by": "SX_TRAUMA",
    "fracture": "SX_TRAUMA",
    "broken bone": "SX_TRAUMA",
    "nahulog": "SX_TRAUMA",
    "nabangga": "SX_TRAUMA",
    "naaksidente": "SX_TRAUMA",
    "bali ang buto": "SX_TRAUMA",
    "napilay": "SX_TRAUMA",
    # Gout (SX_GOUT)
    "gout": "SX_GOUT",
    "gout attack": "SX_GOUT",
    "uric acid high": "SX_GOUT",
    "big toe pain severe": "SX_GOUT",
    "tuhod sumasakit pag kumain ng karne": "SX_GOUT",
    "sakit ng daliri sa paa": "SX_GOUT",
    "mataas ang uric acid": "SX_GOUT",
    "rayuma sa paa": "SX_GOUT",
    # --- MENTAL HEALTH CATEGORY ---
    # Depression (SX_DEPRESSION)
    "feeling depressed": "SX_DEPRESSION",
    "depression": "SX_DEPRESSION",
    "feeling hopeless": "SX_DEPRESSION",
    "no interest in anything": "SX_DEPRESSION",
    "sad all the time": "SX_DEPRESSION",
    "malungkot": "SX_DEPRESSION",
    "depressed": "SX_DEPRESSION",
    "walang gana sa lahat": "SX_DEPRESSION",
    "parang walang saysay ang lahat": "SX_DEPRESSION",
    "laging nalulungkot": "SX_DEPRESSION",
    # Anxiety (SX_ANXIETY)
    "anxiety": "SX_ANXIETY",
    "anxiety attacks": "SX_ANXIETY",
    "panic attack": "SX_ANXIETY",
    "constant worry": "SX_ANXIETY",
    "can't stop worrying": "SX_ANXIETY",
    "kinakabahan": "SX_ANXIETY",
    "laging nag-aalala": "SX_ANXIETY",
    "panic": "SX_ANXIETY",
    "anxiety attack": "SX_ANXIETY",
    "di mapakali": "SX_ANXIETY",
    # Suicidal ideation (SX_SUICIDAL_IDEATION)
    "want to kill myself": "SX_SUICIDAL_IDEATION",
    "suicidal": "SX_SUICIDAL_IDEATION",
    "thinking of ending my life": "SX_SUICIDAL_IDEATION",
    "don't want to live": "SX_SUICIDAL_IDEATION",
    "want to die": "SX_SUICIDAL_IDEATION",
    "gusto ko nang mamatay": "SX_SUICIDAL_IDEATION",
    "ayaw ko na": "SX_SUICIDAL_IDEATION",
    "tapusin ko na": "SX_SUICIDAL_IDEATION",
    "gusto ko nang wakasan": "SX_SUICIDAL_IDEATION",
    "pagod na ako sa buhay": "SX_SUICIDAL_IDEATION",
    # --- DERMATOLOGICAL (NON-INFECTIOUS) CATEGORY ---
    # Psoriasis (SX_PSORIASIS)
    "psoriasis": "SX_PSORIASIS",
    "scaly patches": "SX_PSORIASIS",
    "silvery scales on skin": "SX_PSORIASIS",
    "thick scaly skin": "SX_PSORIASIS",
    "kaliskis ang balat": "SX_PSORIASIS",
    "makapal na kaliskis sa balat": "SX_PSORIASIS",
    "parang pilak na kaliskis": "SX_PSORIASIS",
    # Chronic eczema (SX_CHRONIC_ECZEMA)
    "eczema": "SX_CHRONIC_ECZEMA",
    "chronic eczema": "SX_CHRONIC_ECZEMA",
    "atopic dermatitis": "SX_CHRONIC_ECZEMA",
    "itchy dry skin for years": "SX_CHRONIC_ECZEMA",
    "eksema": "SX_CHRONIC_ECZEMA",
    "makati at tuyong balat matagal na": "SX_CHRONIC_ECZEMA",
    "makating balat na hindi nawawala": "SX_CHRONIC_ECZEMA",
    # Vitiligo (SX_VITILIGO)
    "vitiligo": "SX_VITILIGO",
    "white patches on skin": "SX_VITILIGO",
    "loss of skin color": "SX_VITILIGO",
    "depigmentation": "SX_VITILIGO",
    "buni": "SX_VITILIGO",
    "puting pantal sa balat": "SX_VITILIGO",
    "nawalan ng kulay ang balat": "SX_VITILIGO",
}

# --- TIER 3: Category Groupings ---
# Groups Tier 3 concepts by medical category for routing referral messages.
# Used to determine which specialist/department to refer to.
TIER3_CATEGORIES = {
    "STI_GENITOURINARY": {
        "SX_GENITAL_DISCHARGE",
        "SX_DYSURIA",
        "SX_GENITAL_ULCER",
        "SX_PELVIC_PAIN",
    },
    "CARDIOVASCULAR": {
        "SX_CARDIAC_CHEST_PAIN",
        "SX_PERIPHERAL_EDEMA",
        "SX_PALPITATIONS_SYNCOPE",
    },
    "NEUROLOGICAL": {
        "SX_FOCAL_WEAKNESS",
        "SX_SEIZURE",
        "SX_THUNDERCLAP_HEADACHE",
        "SX_SLURRED_SPEECH",
    },
    "ENDOCRINE": {
        "SX_DIABETES_TRIAD",
        "SX_GOITER",
    },
    "MUSCULOSKELETAL": {
        "SX_CHRONIC_ARTHRITIS",
        "SX_TRAUMA",
        "SX_GOUT",
    },
    "MENTAL_HEALTH": {
        "SX_DEPRESSION",
        "SX_ANXIETY",
        "SX_SUICIDAL_IDEATION",
    },
    "DERMATOLOGICAL": {
        "SX_PSORIASIS",
        "SX_CHRONIC_ECZEMA",
        "SX_VITILIGO",
    },
}

# Reverse lookup: concept -> category
TIER3_CONCEPT_TO_CATEGORY = {}
for category, concepts in TIER3_CATEGORIES.items():
    for concept in concepts:
        TIER3_CONCEPT_TO_CATEGORY[concept] = category

# --- TIER 3: Bilingual Referral Messages ---
# Referral messages for each Tier 3 category in English and Tagalog.
# These messages provide appropriate guidance when a user's symptoms indicate
# a condition outside the system's diagnostic scope.
TIER3_REFERRAL_MESSAGES = {
    "STI_GENITOURINARY": {
        "en": (
            "Your symptoms may suggest a genitourinary or sexually transmitted condition. "
            "This is outside the scope of this diagnostic tool. Please consult a "
            "healthcare provider, such as a doctor at a health center or hospital, "
            "who can properly evaluate and treat these concerns. Your privacy will be respected."
        ),
        "tl": (
            "Ang iyong mga sintomas ay maaaring may kaugnayan sa kondisyon ng sistema ng pag-ihi "
            "o sakit na nakukuha sa pakikipagtalik. Ito ay lampas sa saklaw ng tool na ito. "
            "Mangyaring kumonsulta sa isang healthcare provider, tulad ng doktor sa health center "
            "o ospital, na makakapag-evaluate at makakapag-gamot nang tama. Iginagalang ang iyong privacy."
        ),
    },
    "CARDIOVASCULAR": {
        "en": (
            "Your symptoms may indicate a heart or circulation problem that requires "
            "immediate medical attention. Please seek emergency care or go to the nearest "
            "hospital emergency room immediately. Do not delay, as early treatment is crucial "
            "for heart-related conditions."
        ),
        "tl": (
            "Ang iyong mga sintomas ay maaaring nagpapahiwatig ng problema sa puso o sirkulasyon "
            "na nangangailangan ng agarang atensyong medikal. Mangyaring magpunta kaagad sa "
            "emergency room ng pinakamalapit na ospital. Huwag mag-antala, dahil mahalaga ang "
            "maagang paggamot para sa mga kondisyon ng puso."
        ),
    },
    "NEUROLOGICAL": {
        "en": (
            "Your symptoms may suggest a serious neurological condition that requires "
            "immediate medical evaluation. Please seek emergency care immediately. Symptoms "
            "like sudden weakness, seizures, severe headache, or speech changes can indicate "
            "conditions that need urgent treatment."
        ),
        "tl": (
            "Ang iyong mga sintomas ay maaaring nagpapahiwatig ng seryosong kondisyon sa utak "
            "o nerves na nangangailangan ng agarang pagsusuri. Magpunta kaagad sa emergency. "
            "Ang mga sintomas tulad ng biglaang panghihina, kombulsyon, matinding sakit ng ulo, "
            "o pagbabago sa pagsasalita ay maaaring nangangailangan ng agarang paggamot."
        ),
    },
    "ENDOCRINE": {
        "en": (
            "Your symptoms may suggest a hormonal or metabolic condition, such as diabetes "
            "or thyroid problems. Please consult a healthcare provider for proper evaluation "
            "and testing. These conditions are manageable with proper medical care."
        ),
        "tl": (
            "Ang iyong mga sintomas ay maaaring may kaugnayan sa kondisyon ng hormones o metabolism, "
            "tulad ng diabetes o problema sa thyroid. Mangyaring kumonsulta sa healthcare provider "
            "para sa tamang pagsusuri at mga test. Ang mga kondisyong ito ay napapangasiwaan "
            "sa tulong ng tamang medikal na pangangalaga."
        ),
    },
    "MUSCULOSKELETAL": {
        "en": (
            "Your symptoms suggest a bone, joint, or muscle condition that is not related "
            "to infectious disease. Please consult with a healthcare provider who can evaluate "
            "your condition. If due to injury or trauma, seek appropriate medical care based "
            "on the severity."
        ),
        "tl": (
            "Ang iyong mga sintomas ay nagpapahiwatig ng kondisyon sa buto, kasukasuan, o kalamnan "
            "na hindi nauugnay sa nakakahawang sakit. Mangyaring kumonsulta sa healthcare provider "
            "para suriin ang iyong kondisyon. Kung dahil sa injury o aksidente, humanap ng "
            "naaangkop na medikal na pangangalaga batay sa kalubhaan."
        ),
    },
    "MENTAL_HEALTH": {
        "en": (
            "Your symptoms may suggest a mental health concern. You are not alone, and help "
            "is available. Please reach out to a mental health professional, counselor, or "
            "call a crisis hotline. In the Philippines, you can contact the National Center "
            "for Mental Health Crisis Hotline at 0917-899-8727 (USAP)."
        ),
        "tl": (
            "Ang iyong mga sintomas ay maaaring may kaugnayan sa mental health. Hindi ka nag-iisa, "
            "at may tulong na available. Mangyaring lumapit sa mental health professional, counselor, "
            "o tumawag sa crisis hotline. Sa Pilipinas, maaari kang tumawag sa National Center "
            "for Mental Health Crisis Hotline: 0917-899-8727 (USAP)."
        ),
    },
    "DERMATOLOGICAL": {
        "en": (
            "Your symptoms suggest a chronic skin condition that is not related to acute "
            "infectious disease. Please consult a dermatologist or healthcare provider who "
            "can properly evaluate and treat chronic skin conditions."
        ),
        "tl": (
            "Ang iyong mga sintomas ay nagpapahiwatig ng chronic na kondisyon sa balat na hindi "
            "nauugnay sa acute na nakakahawang sakit. Mangyaring kumonsulta sa dermatologist "
            "o healthcare provider na makakapag-evaluate at makakapag-gamot ng chronic skin conditions."
        ),
    },
}

# --- Fuzzy Matching Configuration ---
# Length-tiered similarity thresholds to mitigate false positives.
# Short words (e.g., "baha", "ihi") need near-exact match to prevent collisions.
FUZZY_THRESHOLD_SHORT = 95  # terms <= 5 chars
FUZZY_THRESHOLD_MEDIUM = 95  # terms 6–9 chars
FUZZY_THRESHOLD_LONG = 90  # terms ≥ 10 chars
FUZZY_MIN_TERM_LENGTH = 3  # skip fuzzy matching for terms shorter than this

# --- Out-of-Scope Disease Registry ---
# Diseases that mimic the 6 in-scope diseases but require different clinical management.
# Used by the verification layer to flag predictions when symptom patterns suggest
# these conditions rather than in-scope diseases.
# Reference: docs/out-of-scope-diseases.md
#
# Format: { "DISEASE_KEY": { "icd10": str, "snomed": str, "meddra": str, "mimics": [str], "differentiators": [str] } }
OUT_OF_SCOPE_DISEASES = {
    # === DENGUE MIMICKERS ===
    "CHIKUNGUNYA": {
        "icd10": "A92.0",
        "snomed": "111864006",
        "meddra": "10008691",
        "mimics": ["DENGUE"],
        "differentiators": [
            "SX_PERSISTENT_POLYARTHRALGIA",
            "SX_SYMMETRIC_JOINT_INVOLVEMENT",
        ],
    },
    "MALARIA": {
        "icd10": "B50",  # B50-B54 range
        "snomed": "61462000",
        "meddra": "10025487",
        "mimics": ["DENGUE", "TYPHOID"],
        "differentiators": [
            "SX_CYCLICAL_FEVER",
            "SX_RIGORS",
            "SX_PALLOR",
            "RISK_MALARIA_ENDEMIC_TRAVEL",
        ],
    },
    "LEPTOSPIROSIS": {
        "icd10": "A27.9",
        "snomed": "77377001",
        "meddra": "10024264",
        "mimics": ["DENGUE", "TYPHOID"],
        "differentiators": [
            "SX_CALF_PAIN",
            "SX_CALF_MYALGIA",
            "SX_JAUNDICE",
            "SX_OLIGURIA",
            "RISK_FLOOD_EXPOSURE",
            "SX_CONJUNCTIVAL_SUFFUSION",
        ],
    },
    "ZIKA": {
        "icd10": "A92.5",
        "snomed": "3928002",
        "meddra": "10082913",
        "mimics": ["DENGUE"],
        "differentiators": [
            "SX_MILD_FEVER",
            "SX_PROMINENT_CONJUNCTIVITIS",
        ],
    },
    "COVID19": {
        "icd10": "U07.1",
        "snomed": "840539006",
        "meddra": "10084268",
        "mimics": ["DENGUE", "INFLUENZA"],
        "differentiators": [
            "SX_ANOSMIA",
            "SX_AGEUSIA",
            "SX_SILENT_HYPOXIA",
        ],
    },
    # === TYPHOID MIMICKERS ===
    "BRUCELLOSIS": {
        "icd10": "A23.9",
        "snomed": "75702008",
        "meddra": "10006227",
        "mimics": ["TYPHOID"],
        "differentiators": [
            "SX_UNDULATING_FEVER",
            "SX_DRENCHING_SWEATS",
            "SX_SACROILIITIS",
            "RISK_ANIMAL_DAIRY_EXPOSURE",
        ],
    },
    "MILIARY_TB": {
        "icd10": "A19.9",
        "snomed": "154283005",
        "meddra": "10044159",
        "mimics": ["TYPHOID", "PNEUMONIA"],
        "differentiators": [
            "SX_CHRONIC_COUGH",
            "SX_NIGHT_SWEATS",
            "SX_HEMOPTYSIS",
            "RISK_TB_EXPOSURE",
        ],
    },
    "SCRUB_TYPHUS": {
        "icd10": "A75.3",
        "snomed": "240613006",
        "meddra": "10039812",
        "mimics": ["TYPHOID"],
        "differentiators": [
            "SX_ESCHAR",
            "SX_REGIONAL_LYMPHADENOPATHY",
            "RISK_OUTDOOR_RURAL_EXPOSURE",
        ],
    },
    "INFECTIOUS_MONONUCLEOSIS": {
        "icd10": "B27.9",
        "snomed": "271558008",
        "meddra": "10021673",
        "mimics": ["TYPHOID"],
        "differentiators": [
            "SX_EXUDATIVE_PHARYNGITIS",
            "SX_POST_AURICULAR_LYMPHADENOPATHY",
            "SX_SPLENOMEGALY",
        ],
    },
    # === INFLUENZA MIMICKERS ===
    "RSV": {
        "icd10": "J21.0",
        "snomed": "55735004",
        "meddra": "10038898",
        "mimics": ["INFLUENZA", "PNEUMONIA"],
        "differentiators": [
            "SX_WHEEZING",
            "SX_BRONCHIOLITIS",
            "RISK_INFANT_ELDERLY",
        ],
    },
    "PARAINFLUENZA": {
        "icd10": "J06.9",
        "snomed": "407479009",
        "meddra": "10033714",
        "mimics": ["INFLUENZA"],
        "differentiators": [
            "SX_CROUP",
            "SX_BARKING_COUGH",
            "SX_STRIDOR",
            "RISK_PEDIATRIC",
        ],
    },
    "HMPV": {  # Human Metapneumovirus
        "icd10": "J21.1",
        "snomed": "442696006",
        "meddra": "10067711",
        "mimics": ["INFLUENZA", "PNEUMONIA"],
        "differentiators": [
            "SX_BRONCHIOLITIS",
            "RISK_INFANT_ELDERLY",
        ],
    },
    # === MEASLES MIMICKERS ===
    "RUBELLA": {
        "icd10": "B06.9",
        "snomed": "36653000",
        "meddra": "10039471",
        "mimics": ["MEASLES"],
        "differentiators": [
            "SX_POST_AURICULAR_LYMPHADENOPATHY",
            "SX_MILD_FEVER",
            "SX_ADULT_ARTHRALGIA",
        ],
    },
    "ROSEOLA": {
        "icd10": "B08.2",
        "snomed": "31368003",
        "meddra": "10039163",
        "mimics": ["MEASLES"],
        "differentiators": [
            "SX_RASH_AFTER_FEVER_RESOLVES",  # Pathognomonic
            "RISK_INFANT_6_24_MONTHS",
        ],
    },
    "KAWASAKI": {
        "icd10": "M30.3",
        "snomed": "75053002",
        "meddra": "10023320",
        "mimics": ["MEASLES"],
        "differentiators": [
            "SX_PROLONGED_FEVER",
            "SX_STRAWBERRY_TONGUE",
            "SX_PEELING_SKIN",
            "LAB_ELEVATED_CRP",  # >3 mg/dL
        ],
    },
    "SCARLET_FEVER": {
        "icd10": "A38",
        "snomed": "30242009",
        "meddra": "10039525",
        "mimics": ["MEASLES"],
        "differentiators": [
            "SX_SANDPAPER_RASH",
            "SX_STRAWBERRY_TONGUE",
            "SX_CIRCUMORAL_PALLOR",
            "SX_PASTIA_LINES",
        ],
    },
    "FIFTH_DISEASE": {  # Erythema Infectiosum
        "icd10": "B08.3",
        "snomed": "65399007",
        "meddra": "10015228",
        "mimics": ["MEASLES"],
        "differentiators": [
            "SX_SLAPPED_CHEEK_RASH",
            "SX_LACY_RETICULAR_RASH",
        ],
    },
    # === PNEUMONIA MIMICKERS ===
    "PULMONARY_TB": {
        "icd10": "A15.0",
        "snomed": "154283005",
        "meddra": "10044159",
        "mimics": ["PNEUMONIA"],
        "differentiators": [
            "SX_CHRONIC_COUGH",
            "SX_NIGHT_SWEATS",
            "SX_HEMOPTYSIS",
            "SX_AFTERNOON_EVENING_FEVER",
            "RISK_TB_EXPOSURE",
        ],
    },
    "PERTUSSIS": {
        "icd10": "A37.9",
        "snomed": "27836007",
        "meddra": "10034746",
        "mimics": ["PNEUMONIA", "INFLUENZA"],
        "differentiators": [
            "SX_PAROXYSMAL_COUGH",
            "SX_INSPIRATORY_WHOOP",
            "SX_POST_TUSSIVE_VOMITING",
        ],
    },
    "MYCOPLASMA_PNEUMONIA": {
        "icd10": "J15.7",
        "snomed": "312349006",
        "meddra": "10028085",
        "mimics": ["PNEUMONIA"],
        "differentiators": [
            "SX_DRY_COUGH",
            "SX_WALKING_PNEUMONIA",
            "SX_BULLOUS_MYRINGITIS",
        ],
    },
    "LEGIONELLA_PNEUMONIA": {
        "icd10": "A48.1",
        "snomed": "312350006",
        "meddra": "10024133",
        "mimics": ["PNEUMONIA"],
        "differentiators": [
            "SX_GI_SYMPTOMS_WITH_PNEUMONIA",
            "SX_HYPONATREMIA",
            "SX_ENCEPHALOPATHY",
            "RISK_CONTAMINATED_WATER",
        ],
    },
    "PULMONARY_EMBOLISM": {
        "icd10": "I26.9",
        "snomed": "59282003",
        "meddra": "10037377",
        "mimics": ["PNEUMONIA"],
        "differentiators": [
            "SX_SUDDEN_ONSET_DYSPNEA",
            "SX_PLEURITIC_CHEST_PAIN",
            "RISK_DVT_FACTORS",
            "SX_DISPROPORTIONATE_HYPOXIA",
        ],
    },
    # === DIARRHEA MIMICKERS ===
    "CHOLERA": {
        "icd10": "A00.9",
        "snomed": "63650001",
        "meddra": "10008647",
        "mimics": ["DIARRHEA"],
        "differentiators": [
            "SX_RICE_WATER_STOOL",
            "SX_SEVERE_DEHYDRATION",
            "SX_MASSIVE_FLUID_LOSS",
        ],
    },
    "SHIGELLOSIS": {
        "icd10": "A03.9",
        "snomed": "36188001",
        "meddra": "10040482",
        "mimics": ["DIARRHEA"],
        "differentiators": [
            "SX_BLOODY_STOOL",
            "SX_MUCOID_STOOL",
            "SX_TENESMUS",
        ],
    },
    "CAMPYLOBACTER": {
        "icd10": "A04.5",
        "snomed": "302231008",
        "meddra": "10007001",
        "mimics": ["DIARRHEA"],
        "differentiators": [
            "SX_BLOODY_STOOL",
            "SX_SEVERE_CRAMPING",
            "RISK_POULTRY_EXPOSURE",
        ],
    },
    "ROTAVIRUS": {
        "icd10": "A08.0",
        "snomed": "18624000",
        "meddra": "10039424",
        "mimics": ["DIARRHEA"],
        "differentiators": [
            "SX_VOMITING_BEFORE_DIARRHEA",
            "RISK_INFANT_TODDLER",
            "RISK_WINTER_SEASON",
        ],
    },
    "NOROVIRUS": {
        "icd10": "A08.1",
        "snomed": "407359000",
        "meddra": "10068529",
        "mimics": ["DIARRHEA"],
        "differentiators": [
            "SX_SUDDEN_ONSET",
            "SX_PROMINENT_VOMITING",
            "RISK_OUTBREAK_SETTING",
        ],
    },
    "IBD": {  # Inflammatory Bowel Disease
        "icd10": "K50",  # K50-K52 range
        "snomed": "24526004",
        "meddra": "10022653",
        "mimics": ["DIARRHEA"],
        "differentiators": [
            "SX_CHRONIC_RELAPSING_DIARRHEA",
            "SX_BLOODY_STOOL",
            "SX_EXTRAINTESTINAL_MANIFESTATIONS",
        ],
    },
}

# Set of all out-of-scope differentiator concepts for quick lookup
OUT_OF_SCOPE_DIFFERENTIATORS = set()
for disease_data in OUT_OF_SCOPE_DISEASES.values():
    OUT_OF_SCOPE_DIFFERENTIATORS.update(disease_data.get("differentiators", []))
