"""
Semantic Question Groups for Follow-Up Question Deduplication.

Maps semantically equivalent questions across different diseases. When a question
from a group is asked or answered, all other questions in that group should be
skipped to avoid repetitive questioning.

Each group represents a symptom concept that may be asked about in different
disease contexts but essentially queries the same patient experience.
"""

from __future__ import annotations

# Semantic groups: question IDs that ask about the same symptom concept
# When one question in a group is asked, the others become redundant
QUESTION_GROUPS: dict[str, list[str]] = {
    # ==================== FEVER-RELATED ====================
    "high_fever": [
        "dengue_q1",  # EN: extremely high fever, burning up
        "dengue_q3",  # TL: lagnat o tumaas na temperatura
        "pneumonia_q4",  # EN: persistent fever with chills
        "pneumonia_q8",  # TL: lagnat o tumaas na temperatura
        "typhoid_q1",  # EN: fever lasting many days, getting worse
        "typhoid_q3",  # TL: lagnat o tumaas na temperatura
        "diarrhea_q5",  # TL: lagnat
        "diarrhea_q9",  # EN: mild fever (different severity but same concept)
        "measles_q2",  # EN: high fever with cough / TL: mataas na lagnat
        "influenza_q1",  # EN: sudden fever and chills / TL: bigla na lagnat
    ],
    # ==================== NAUSEA / VOMITING ====================
    "nausea_vomiting": [
        "dengue_q7",  # EN: nauseous or vomited
        "dengue_q8",  # TL: pagduduwal o pagsusuka
        "pneumonia_q8",  # EN: nauseous or sick to stomach
        "typhoid_q5",  # TL: pagduduwal o pagsusuka
        "diarrhea_q7",  # EN: nauseous, queasy, throwing up
        "diarrhea_q6",  # TL: pagduduwal o pagsusuka
        "influenza_q10",  # TL: pagsusuka o pagtatae
    ],
    # ==================== FATIGUE / EXHAUSTION ====================
    "fatigue_exhaustion": [
        "dengue_q8",  # EN: overwhelmingly exhausted, wiped out
        "dengue_q9",  # TL: hindi pangkaraniwang pagod o panghihina
        "pneumonia_q6",  # EN: extremely weak, no energy
        "pneumonia_q5",  # TL: hindi pangkaraniwang pagod o panghihina
        "typhoid_q7",  # EN: lost appetite and entirely drained
        "typhoid_q4",  # TL: hindi pangkaraniwang pagod o panghihina
        "diarrhea_q8",  # EN: entirely drained, extremely weak
        "diarrhea_q9",  # TL: matinding panghihina o pagod
        "measles_q8",  # EN: completely exhausted, wiped out
        "measles_q10",  # TL: matinding pagod
        "influenza_q4",  # EN: completely exhausted, tired, wiped out
        "influenza_q5",  # TL: labis na pagod o panghihina
    ],
    # ==================== HEADACHE ====================
    "headache": [
        "dengue_q6",  # EN: severe, pounding, splitting headache
        "dengue_q10",  # TL: pananakit ng ulo
        "pneumonia_q9",  # EN: dull or persistent headache
        "typhoid_q6",  # EN: constant dull ache in front of head
        "typhoid_q8",  # TL: pananakit ng ulo
        "influenza_q5",  # EN: pounding or lingering headache
        "influenza_q6",  # TL: masakit ang ulo
    ],
    # ==================== BODY/MUSCLE ACHES ====================
    "body_muscle_aches": [
        "dengue_q2",  # EN: severe muscle and joint pain, whole body aches
        "dengue_q2",  # TL: matinding pananakit ng joints o kalamnan
        "pneumonia_q7",  # EN: general body aches or muscle pain
        "pneumonia_q4",  # TL: pananakit sa katawan
        "pneumonia_q10",  # TL: pananakit ng joints o kalamnan
        "measles_q8",  # TL: pananakit ng kalamnan o katawan
        "influenza_q3",  # EN: sore muscles or body aches all over
        "influenza_q2",  # TL: matinding pananakit ng kalamnan o katawan
    ],
    # ==================== JOINT PAIN (more specific) ====================
    "joint_pain": [
        "dengue_q9",  # EN: joints stiff and sore
        "pneumonia_q10",  # TL: pananakit ng joints o kalamnan
        "dengue_q2",  # TL: matinding pananakit ng joints o kalamnan
    ],
    # ==================== CHILLS / SHIVERING ====================
    "chills_shivering": [
        "dengue_q7",  # TL: panginginig o pakiramdam na sobrang lamig
        "pneumonia_q6",  # TL: panginginig o nanginginig sa ginaw
        "typhoid_q9",  # TL: panginginig o pakiramdam na sobrang lamig
        "influenza_q3",  # TL: panginginig o pagpapawis
    ],
    # ==================== COUGH (general) ====================
    "cough_general": [
        "pneumonia_q1",  # EN: coughing up thick phlegm
        "pneumonia_q7",  # TL: ubo
        "measles_q2",  # EN: persistent dry hacking cough
        "measles_q3",  # TL: tuyong ubo
        "influenza_q2",  # EN: persistent dry or hacking cough
        "influenza_q4",  # TL: tuyo at paulit-ulit na ubo
    ],
    # ==================== DRY COUGH (specific) ====================
    "dry_cough": [
        "measles_q2",  # EN: persistent dry hacking cough
        "measles_q3",  # TL: tuyong ubo
        "influenza_q2",  # EN: persistent dry or hacking cough
        "influenza_q4",  # TL: tuyo at paulit-ulit na ubo
        "influenza_q9",  # EN: cough is mostly dry
    ],
    # ==================== PRODUCTIVE COUGH / PHLEGM ====================
    "productive_cough_phlegm": [
        "pneumonia_q1",  # EN: coughing up thick phlegm (yellow/green/rusty)
        "pneumonia_q1",  # TL: umuubo ng plema o sipon
    ],
    # ==================== RUNNY NOSE / NASAL SYMPTOMS ====================
    "runny_nose": [
        "measles_q4",  # TL: sipon
        "measles_q5",  # EN: constant runny nose
        "influenza_q7",  # EN: runny nose, stuffy nose
        "influenza_q8",  # TL: sipon o baradong ilong
    ],
    # ==================== SORE THROAT ====================
    "sore_throat": [
        "measles_q9",  # EN: scratchy or sore throat / TL: masakit ang lalamunan
        "influenza_q6",  # EN: scratchy throat, hurts to swallow
        "influenza_q7",  # TL: masakit ang lalamunan
    ],
    # ==================== RETRO-ORBITAL PAIN (DENGUE-SPECIFIC) ====================
    # Dengue causes severe, deep pain BEHIND the eyes (retro-orbital pain)
    # This is a hallmark symptom that distinguishes dengue from other diseases
    "retro_orbital_pain": [
        "dengue_q3",  # EN: deep intense pain behind eyes, especially when moving them
        "dengue_q6",  # TL: pananakit sa mata o sa likod ng mga mata
    ],
    # ==================== GENERAL EYE DISCOMFORT (INFLUENZA/OTHER) ====================
    # Influenza causes general eye symptoms: watering, light sensitivity, discomfort
    # NOT the deep, intense pain behind eyes characteristic of dengue
    "eye_discomfort": [
        "influenza_q9",  # TL: sakit sa likod ng mata o sensitibo sa liwanag
        # Note: measles eye symptoms are in red_watery_eyes and light_sensitivity groups
    ],
    # Generic eye pain - mapping to catch general mentions of eye pain
    "eye_pain_general": [
        "dengue_q3",
        "dengue_q6",
        "influenza_q9",
        "measles_q3",
        "measles_q5",
        "measles_q7",
    ],
    # ==================== RED/WATERY EYES ====================
    "red_watery_eyes": [
        "measles_q3",  # EN: eyes red, watery, sore, sensitive to light
        "measles_q5",  # TL: namumula o nagluluha ang mga mata
    ],
    # ==================== LIGHT SENSITIVITY ====================
    "light_sensitivity": [
        "measles_q3",  # EN: eyes highly sensitive to light
        "measles_q7",  # TL: sensitibo sa liwanag ang mga mata
        "influenza_q9",  # TL: sensitibo sa liwanag
    ],
    # ==================== RASH / SKIN SPOTS ====================
    "skin_rash_spots": [
        "dengue_q4",  # TL: pantal o pulang spot sa balat
        "dengue_q5",  # EN: rash of tiny red dots / TL: pamumula ng balat
        "typhoid_q4",  # EN: faint pink/rose spots on chest/stomach
        "measles_q1",  # EN: red blotchy rash starting on face / TL: pantal na nagsimula sa mukha
    ],
    # ==================== STOMACH/ABDOMINAL PAIN ====================
    "stomach_abdominal_pain": [
        "typhoid_q2",  # EN: stomach tender and cramping
        "typhoid_q1",  # TL: pananakit ng tiyan
        "diarrhea_q2",  # EN: severe twisting stomach cramps
        "diarrhea_q3",  # TL: sakit ng tiyan o pulikat
    ],
    # ==================== DIARRHEA / LOOSE STOOLS ====================
    "diarrhea_loose_stools": [
        "typhoid_q3",  # EN: constipated or watery stools (alternating)
        "typhoid_q6",  # TL: pagtatae o malambot na dumi
        "diarrhea_q1",  # EN: watery or loose stools / TL: matubig o malabnaw
        "measles_q10",  # EN: mild diarrhea or loose stools
        "influenza_q10",  # TL: pagsusuka o pagtatae
    ],
    # ==================== CONSTIPATION ====================
    "constipation": [
        "typhoid_q3",  # EN: unable to pass stool for days
        "typhoid_q7",  # TL: nahihirapan sa pagtae o constipation
    ],
    # ==================== DEHYDRATION / THIRST ====================
    "dehydration_thirst": [
        "diarrhea_q3",  # EN: extreme thirst, dry mouth, dizzy, low urine
        "diarrhea_q4",  # TL: uhaw, tuyong bibig, dehydrated
        "typhoid_q10",  # TL: nahihirapan manatiling hydrated
    ],
    # ==================== LOSS OF APPETITE ====================
    "loss_of_appetite": [
        "typhoid_q7",  # EN: completely lost appetite
        "diarrhea_q10",  # TL: nawalan ng gana kumain
    ],
    # ==================== SHORTNESS OF BREATH ====================
    "shortness_of_breath": [
        "pneumonia_q3",  # EN: unusually short of breath
        "pneumonia_q9",  # TL: nahihirapan sa paghinga
        "pneumonia_q10",  # EN: breathing worse when lying down
    ],
    # ==================== CHEST PAIN ====================
    "chest_pain": [
        "pneumonia_q2",  # EN: sharp stabbing pain in chest/ribs when breathing
        "pneumonia_q3",  # TL: pananakit ng dibdib
        "influenza_q10",  # EN: breathing fine, no sharp chest pain (negative form)
    ],
    # ==================== SWEATING ====================
    "excessive_sweating": [
        "pneumonia_q2",  # TL: labis na pagpapawis
        "pneumonia_q4",  # EN: shivering, sweating chills
        "influenza_q3",  # TL: panginginig o pagpapawis
    ],
    # ==================== BLEEDING (MILD) ====================
    "mild_bleeding": [
        "dengue_q4",  # EN: unusual mild bleeding (gums, nosebleed)
    ],
    # ==================== BLOOD IN STOOL ====================
    "blood_in_stool": [
        "diarrhea_q4",  # EN: blood or red streaks in stool
        "diarrhea_q2",  # TL: dugo sa dumi
    ],
    # ==================== CONFUSION / MENTAL FOG ====================
    "confusion_mental_fog": [
        "typhoid_q8",  # EN: confused, disoriented, foggy mind
    ],
    # ==================== SLOW PULSE (BRADYCARDIA) ====================
    "slow_pulse": [
        "typhoid_q5",  # EN: pulse unusually slow despite fever
    ],
    # ==================== WHITE SPOTS IN MOUTH (KOPLIK) ====================
    "koplik_spots": [
        "measles_q6",  # EN: tiny white spots inside cheeks / TL: puting spot sa bibig
    ],
    # ==================== SYMPTOM ONSET TIMING ====================
    "sudden_onset": [
        "influenza_q1",  # EN: symptoms hit suddenly / TL: bigla ang pagsimula
    ],
    "gradual_onset": [
        "typhoid_q9",  # EN: symptoms came on slowly over days
    ],
    # ==================== ABSENCE QUESTIONS (DIFFERENTIATORS) ====================
    # These are special - they ask about the ABSENCE of symptoms to differentiate
    # We group them separately as they serve a diagnostic purpose
    "no_cough_no_runny_nose": [
        "dengue_q10",  # EN: symptoms without cough or runny nose
        "typhoid_q10",  # EN: without severe cough or breathing problems
        "diarrhea_q5",  # EN: without cough, runny nose, or breathing issues
    ],
    "no_rash_no_eye_pain": [
        "influenza_q8",  # EN: without skin rash or deep pain behind eyes
    ],
    "no_bleeding_no_bone_pain": [
        "measles_q7",  # EN: without unusual bleeding or severe bone pain
    ],
}


# ══════════════════════════════════════════════════════════════════════════════
# POSITIVE TO NEGATIVE QUESTION MAPPING
# ══════════════════════════════════════════════════════════════════════════════
# Maps positive symptom groups to "differentiator" questions that ask about
# the ABSENCE of those symptoms. When a user mentions having symptom X, we should
# skip questions that ask "Do you NOT have X?" since the answer is already known.
#
# Example: User says "I have a rash and pain behind my eyes"
#   → Skip influenza_q8 which asks "without a skin rash or deep pain behind eyes?"
#   → The answer is clearly "No, I DO have those symptoms"
# ══════════════════════════════════════════════════════════════════════════════

POSITIVE_TO_NEGATIVE_QUESTIONS: dict[str, list[str]] = {
    # If user mentions cough → skip questions asking "without cough"
    "cough_general": [
        "dengue_q10",  # "without a cough or runny nose"
        "typhoid_q10",  # "without a severe cough or breathing problems"
        "diarrhea_q5",  # "without a cough, runny nose, or difficulty breathing"
    ],
    # If user mentions runny nose → skip questions asking "without runny nose"
    "runny_nose": [
        "dengue_q10",  # "without a cough or runny nose"
        "pneumonia_q5",  # "without a runny nose or sniffles"
        "diarrhea_q5",  # "without a cough, runny nose, or difficulty breathing"
    ],
    # If user mentions skin rash/spots → skip influenza_q8
    "skin_rash_spots": [
        "influenza_q8",  # "without a skin rash or deep pain behind your eyes"
    ],
    # If user mentions retro-orbital pain → skip influenza_q8
    "retro_orbital_pain": [
        "influenza_q8",  # "without a skin rash or deep pain behind your eyes"
    ],
    # If user mentions generic eye pain → skip influenza_q8
    "eye_pain_general": [
        "influenza_q8",  # "without a skin rash or deep pain behind your eyes"
    ],
    # If user mentions bleeding → skip measles_q7
    "mild_bleeding": [
        "measles_q7",  # "without any unusual bleeding or severe, deep bone pain"
    ],
    # If user mentions bone pain → skip measles_q7
    "body_muscle_aches": [
        "measles_q7",  # "without any unusual bleeding or severe, deep bone pain"
    ],
    # If user mentions shortness of breath → skip questions asking "without breathing problems"
    "shortness_of_breath": [
        "typhoid_q10",  # "without a severe cough or breathing problems"
        "diarrhea_q5",  # "without a cough, runny nose, or difficulty breathing"
    ],
}


# ══════════════════════════════════════════════════════════════════════════════
# QUESTION PREREQUISITES
# ══════════════════════════════════════════════════════════════════════════════
# Some questions are conditional - they only make sense if a prerequisite
# symptom has been confirmed. For example, questions about cough CHARACTER
# (dry vs productive) should only be asked after confirming the user HAS a cough.
#
# Format: {dependent_question: {prerequisite_symptom_group: required_answer}}
# - required_answer: "yes" means the prerequisite must be answered positively
# - required_answer: "no" means the prerequisite must be answered negatively
#
# Example: influenza_q9 asks "Is your cough mostly dry?"
#   → This only makes sense if user has confirmed they have a cough
#   → Prerequisite: cough_existence must be "yes"
# ══════════════════════════════════════════════════════════════════════════════

# Questions that ask about cough existence (not character)
COUGH_EXISTENCE_QUESTIONS: set[str] = {
    "influenza_q2",  # EN: "Do you have a persistent, dry, or hacking cough?"
    "measles_q2",  # EN: "Are you experiencing a high fever along with a persistent, dry, hacking cough?"
    "pneumonia_q1",  # EN: "Are you coughing up thick, wet phlegm..." (implies cough exists)
}

# Questions that ask about cough CHARACTER (require cough to exist first)
COUGH_CHARACTER_QUESTIONS: set[str] = {
    "influenza_q9",  # EN: "Is your cough mostly dry, meaning you are not coughing up thick, colored phlegm?"
}

# Questions that ask about runny nose existence
RUNNY_NOSE_EXISTENCE_QUESTIONS: set[str] = {
    "influenza_q7",  # EN: "Do you have a runny nose, stuffy nose, or constant sniffles?"
    "measles_q5",  # EN: "Do you have a constant runny nose or sniffles?"
}

# Questions that indicate ABSENCE of cough/runny nose (differentiators)
# If user answers "yes" to these, they DON'T have cough/runny nose
NO_COUGH_NO_RUNNY_NOSE_QUESTIONS: set[str] = {
    "dengue_q10",  # EN: "Are you experiencing these symptoms completely without a cough or runny nose?"
    "typhoid_q10",  # EN: "...without a severe cough or breathing problems?"
    "diarrhea_q5",  # EN: "...without a cough, runny nose, or difficulty breathing?"
    "pneumonia_q5",  # EN: "...without a runny nose or sniffles?"
}


def check_cough_prerequisite(
    answered_questions: dict[str, str], candidate_question_id: str
) -> bool:
    """
    Check if a candidate question's cough-related prerequisite is satisfied.

    Args:
        answered_questions: Dict of {question_id: "yes"|"no"} for answered questions
        candidate_question_id: The question we want to ask

    Returns:
        True if the question can be asked (prerequisite satisfied or no prerequisite)
        False if the question should be skipped (prerequisite not satisfied)
    """
    # Only check for cough character questions
    if candidate_question_id not in COUGH_CHARACTER_QUESTIONS:
        return True  # No prerequisite needed

    # Check if user has confirmed they have a cough
    for q_id, answer in answered_questions.items():
        # If user answered "yes" to a cough existence question, they have a cough
        if q_id in COUGH_EXISTENCE_QUESTIONS and answer == "yes":
            return True  # Cough confirmed, can ask about character

        # If user answered "yes" to a "no cough" differentiator, they DON'T have a cough
        if q_id in NO_COUGH_NO_RUNNY_NOSE_QUESTIONS and answer == "yes":
            return False  # No cough confirmed, skip cough character questions

    # Check if user answered "no" to "without cough" questions
    # "no" to "without cough" = they DO have cough, but we need to confirm it's actually cough
    # (could be just runny nose from the compound question)
    for q_id, answer in answered_questions.items():
        if q_id in NO_COUGH_NO_RUNNY_NOSE_QUESTIONS and answer == "no":
            # User said "no" to "without cough/runny nose" - means they have one or both
            # But we don't know if it's cough specifically!
            # We should ask a cough existence question first
            # Check if any cough existence question has been asked
            cough_confirmed = any(
                qid in COUGH_EXISTENCE_QUESTIONS
                and answered_questions.get(qid) == "yes"
                for qid in answered_questions
            )
            if not cough_confirmed:
                return False  # Need to confirm cough existence first

    # If we haven't established cough status yet, don't ask about character
    # (prefer to ask existence questions first)
    return False


def get_questions_blocked_by_prerequisites(
    answered_questions: dict[str, str],
) -> set[str]:
    """
    Get all question IDs that should be skipped because their prerequisites
    are not satisfied.

    Args:
        answered_questions: Dict of {question_id: "yes"|"no"} for answered questions

    Returns:
        Set of question IDs that should not be asked due to unmet prerequisites
    """
    blocked = set()

    # Check cough character questions
    for q_id in COUGH_CHARACTER_QUESTIONS:
        if not check_cough_prerequisite(answered_questions, q_id):
            blocked.add(q_id)

    return blocked


def get_groups_for_question(question_id: str) -> list[str]:
    """
    Get all group names that contain a given question ID.

    Args:
        question_id: The question ID to look up (e.g., "dengue_q7")

    Returns:
        List of group names that contain this question
    """
    groups = []
    for group_name, question_ids in QUESTION_GROUPS.items():
        if question_id in question_ids:
            groups.append(group_name)
    return groups


def get_related_questions(question_id: str) -> set[str]:
    """
    Get all question IDs that are semantically related to a given question.

    Args:
        question_id: The question ID to look up (e.g., "dengue_q7")

    Returns:
        Set of all related question IDs (including the input question itself)
    """
    related = set()
    for group_name in get_groups_for_question(question_id):
        related.update(QUESTION_GROUPS[group_name])
    return related


def expand_asked_questions(asked_question_ids: set[str]) -> set[str]:
    """
    Expand a set of asked question IDs to include all semantically related questions.

    This is the main function to use when filtering candidates - it takes the
    questions that have been asked and returns a larger set that includes all
    questions that would be redundant to ask.

    Args:
        asked_question_ids: Set of question IDs that have been asked

    Returns:
        Expanded set including all semantically related questions
    """
    expanded = set(asked_question_ids)
    for qid in asked_question_ids:
        expanded.update(get_related_questions(qid))
    return expanded


# Keywords that indicate a symptom has been mentioned in free text
# This extends evidence_keywords.py for cross-group detection
SYMPTOM_KEYWORDS: dict[str, list[str]] = {
    "high_fever": [
        "fever",
        "high fever",
        "burning up",
        "feverish",
        "temperature",
        "lagnat",
        "mataas na lagnat",
        "nilalagnat",
        "mainit",
    ],
    "nausea_vomiting": [
        "nausea",
        "nauseous",
        "vomit",
        "vomiting",
        "throwing up",
        "puke",
        "suka",
        "nagsusuka",
        "pagsusuka",
        "pagduduwal",
        "nasusuka",
    ],
    "fatigue_exhaustion": [
        "tired",
        "exhausted",
        "fatigue",
        "weak",
        "weakness",
        "wiped out",
        "drained",
        "pagod",
        "napapagod",
        "mahina",
        "panghihina",
        "hapo",
    ],
    "headache": [
        "headache",
        "head ache",
        "head pain",
        "head hurts",
        "sakit ng ulo",
        "pananakit ng ulo",
        "masakit ang ulo",
    ],
    "body_muscle_aches": [
        "body ache",
        "muscle ache",
        "muscle pain",
        "body pain",
        "sore muscles",
        "sakit ng katawan",
        "pananakit ng kalamnan",
        "ngalay",
    ],
    "cough_general": [
        "cough",
        "coughing",
        "ubo",
        "umuubo",
        "inuubo",
    ],
    "runny_nose": [
        "runny nose",
        "stuffy nose",
        "blocked nose",
        "congestion",
        "sipon",
        "barado ang ilong",
    ],
    "sore_throat": [
        "sore throat",
        "throat pain",
        "scratchy throat",
        "masakit ang lalamunan",
        "sakit ng lalamunan",
    ],
    "diarrhea_loose_stools": [
        "diarrhea",
        "loose stool",
        "watery stool",
        "frequent bowel",
        "pagtatae",
        "tae",
        "malabnaw na dumi",
    ],
    "stomach_abdominal_pain": [
        "stomach pain",
        "abdominal pain",
        "belly pain",
        "cramps",
        "stomach ache",
        "sakit ng tiyan",
        "pananakit ng tiyan",
        "pulikat",
    ],
    "skin_rash_spots": [
        "rash",
        "spots",
        "red spots",
        "skin rash",
        "pantal",
        "pulang spot",
    ],
    "chills_shivering": [
        "chills",
        "shivering",
        "shaking",
        "cold sweats",
        "panginginig",
        "ginaw",
        "nanginginig",
    ],
    "shortness_of_breath": [
        "shortness of breath",
        "difficulty breathing",
        "hard to breathe",
        "breathless",
        "hirap huminga",
        "nahihirapan huminga",
    ],
    "chest_pain": [
        "chest pain",
        "chest hurts",
        "sakit ng dibdib",
        "pananakit ng dibdib",
    ],
    # Retro-orbital pain (dengue-specific) - deep, intense pain BEHIND the eyes
    "retro_orbital_pain": [
        "pain behind eyes",
        "pain behind my eyes",
        "behind my eyes",
        "behind the eyes",
        "retro-orbital",
        "retroorbital",
        "deep eye pain",
        "intense eye pain",
        "severe eye pain",
        "likod ng mata",  # TL: behind the eyes
        "sa likod ng mata",  # TL: behind the eyes
    ],
    # General eye discomfort (influenza/measles) - watering, sensitivity, general discomfort
    "eye_discomfort": [
        "eye discomfort",
        "watery eyes",
        "eyes watering",
        "sensitive to light",
        "light sensitivity",
        "photophobia",
        "eyes sensitive",
        "eye strain",
        "nagluluha ang mata",  # TL: watery eyes
        "sensitibo sa liwanag",  # TL: light sensitivity
    ],
    # Generic eye pain - used as fallback to catch general "eye pain" mentions
    # This will trigger BOTH retro_orbital_pain and eye_discomfort skipping
    "eye_pain_general": [
        "eye pain",
        "eyes hurt",
        "my eyes hurt",
        "sakit ng mata",
        "pananakit ng mata",
        "masakit ang mata",
    ],
    "dehydration_thirst": [
        "dehydrated",
        "thirsty",
        "dry mouth",
        "uhaw",
        "tuyo ang bibig",
    ],
}


def detect_symptom_groups_in_text(text: str) -> set[str]:
    """
    Detect which symptom groups are mentioned in free-form text.

    Args:
        text: Patient's symptom description text

    Returns:
        Set of group names that have keywords present in the text
    """
    text_lower = text.lower()
    detected_groups = set()

    for group_name, keywords in SYMPTOM_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                detected_groups.add(group_name)
                break  # Found one keyword, move to next group

    return detected_groups


def get_questions_to_skip_from_text(text: str) -> set[str]:
    """
    Get all question IDs that should be skipped based on symptoms mentioned in text.

    This includes:
    1. Questions that directly ask about symptoms the user already mentioned
    2. Differentiator questions that ask about ABSENCE of symptoms the user mentioned
       (e.g., if user says "I have a rash", skip questions asking "without a rash?")

    Args:
        text: Patient's symptom description text

    Returns:
        Set of question IDs that are redundant given the mentioned symptoms
    """
    detected_groups = detect_symptom_groups_in_text(text)
    questions_to_skip = set()

    for group_name in detected_groups:
        # Skip positive questions about this symptom
        if group_name in QUESTION_GROUPS:
            questions_to_skip.update(QUESTION_GROUPS[group_name])

        # Also skip negative/differentiator questions
        # (questions asking "do you NOT have X" when user clearly has X)
        if group_name in POSITIVE_TO_NEGATIVE_QUESTIONS:
            questions_to_skip.update(POSITIVE_TO_NEGATIVE_QUESTIONS[group_name])

    return questions_to_skip
