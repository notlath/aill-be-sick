from typing import Set


def _count_words(text: str) -> int:
    return len([w for w in (text or "").strip().split() if w])


def _has_medical_keywords(text: str, en_keywords: Set[str], tl_keywords: Set[str]) -> bool:
    """
    Check if text contains at least one medical/health-related keyword.
    Returns True if any English or Tagalog keyword is found.
    """
    
    if not text:
        return False
    
    text_lower = text.lower()
    
    has_en_keyword = any(keyword in text_lower for keyword in en_keywords)
    has_tl_keyword = any(keyword in text_lower for keyword in tl_keywords)
    
    return has_en_keyword or has_tl_keyword


def normalize_symptoms(text: str) -> str:
    """Basic normalization / synonym mapping used by follow-up triage."""
    
    text = (text or "").lower()
    
    mapping = {
        # English
        "cold": "chill",
        "feverish": "fever",
        "feverishness": "fever",
        "tired": "fatigue",
        "tire": "fatigue",
        "weak": "fatigue",
        "shortness of breath": "shortness",
        "breathing difficulty": "shortness",
        # Tagalog
        "ginaw": "lagnat",
        "nilalagnat": "lagnat",
        "pagod": "kapaguran",
        "mahina": "kapaguran",
        "hirap huminga": "singal",
        "kulang sa hangin": "singal",
        "ubo": "pag-ubo",
    }
    
    for k, v in mapping.items():
        text = text.replace(k, v)
        
    return text
