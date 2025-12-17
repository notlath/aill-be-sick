from constants import MEDICAL_KEYWORDS_EN, MEDICAL_KEYWORDS_TL


def _count_words(text: str) -> int:
    return len([w for w in (text or "").strip().split() if w])


def _has_medical_keywords(text: str) -> bool:
    """
    Check if text contains at least one medical/health-related keyword.
    Returns True if medical keyword found, False otherwise.

    Note: Checks BOTH English and Tagalog keywords regardless of detected language
    because langdetect can misidentify Tagalog as Indonesian/Slovenian/etc.
    """
    text_lower = text.lower()

    # Check both language sets to handle langdetect misidentifications
    has_en_keyword = any(
        keyword in text_lower for keyword in MEDICAL_KEYWORDS_EN)
    has_tl_keyword = any(
        keyword in text_lower for keyword in MEDICAL_KEYWORDS_TL)

    return has_en_keyword or has_tl_keyword
