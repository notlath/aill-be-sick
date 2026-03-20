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
HIGH_CONFIDENCE_THRESHOLD = float(os.getenv("HIGH_CONFIDENCE_THRESHOLD", "0.90"))
LOW_UNCERTAINTY_THRESHOLD = float(os.getenv("LOW_UNCERTAINTY_THRESHOLD", "0.01"))

# --- Uncertainty Quantification Thresholds ---
# Multi-metric uncertainty thresholds (data-driven, adjust based on validation)

# Confidence thresholds
VALID_MIN_CONF = float(os.getenv("VALID_MIN_CONF", "0.70"))  # Thesis: 70%

# Mutual Information (epistemic uncertainty)
VALID_MAX_UNCERTAINTY = float(os.getenv("VALID_MAX_UNCERTAINTY", "0.05"))  # Thesis: 5%
TRIAGE_LOW_UNCERTAINTY = float(os.getenv("TRIAGE_LOW_UNCERTAINTY", "0.03"))

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
    "sakit sa likod ng mata": "SX_RETROORBITAL_PAIN",
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
    "SX_PROLONGED_FEVER",
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
    "SX_SEVERE_DEHYDRATION",
    "SX_STEPLADDER_FEVER",
    "SX_RIGORS_AND_DIAPHORESIS",
    "SX_CALF_MYALGIA",
    "SX_AFTERNOON_EVENING_FEVER",
    "SX_KOPLIK_SPOTS",
    "SX_MACULOPAPULAR_RASH",
    "SX_RUSTY_SPUTUM",
    "SX_PLEURITIC_CHEST_PAIN",
    "SX_CHEST_INDRAWING",
    # Specific Synthetic NotebookLM Concepts
    "SX_ACUTE_DIARRHEA_HIGH_FREQUENCY",
    "SX_WATERY_STOOL",
    "SX_BLOODY_STOOL",
    "SX_MUCOID_STOOL",
    "SX_FEVER_AND_CHILLS",
    "SX_SEVERE_MYALGIA",
    "SX_SEVERE_FATIGUE",
    "SX_DRY_COUGH",
    "SX_SORE_THROAT_AND_CORYZA",
    "SX_PRODUCTIVE_COUGH_GREEN_SPUTUM",
    "SX_DYSPNEA_ON_EXERTION",
    "SX_DESCENDING_RASH",
    "SX_CONJUNCTIVITIS_AND_PHOTOPHOBIA",
}

# --- Fuzzy Matching Configuration ---
# Length-tiered similarity thresholds to mitigate false positives.
# Short words (e.g., "baha", "ihi") need near-exact match to prevent collisions.
FUZZY_THRESHOLD_SHORT = 95  # terms <= 5 chars
FUZZY_THRESHOLD_MEDIUM = 95  # terms 6–9 chars
FUZZY_THRESHOLD_LONG = 90  # terms ≥ 10 chars
FUZZY_MIN_TERM_LENGTH = 3  # skip fuzzy matching for terms shorter than this
