# CHANGELOG: Tier 3 Tagalog Phrase Detection and Verification UX Improvements

**Date:** March 28, 2026  
**Type:** UX Enhancement & Clinical NLP Bug Fix  
**Scope:** Backend (`config.py`, `diagnosis.py`)  
**Jira/Ticket:** N/A (Thesis-driven UX improvement)

---

## Summary

Improved the NLP detection sensitivity for Tagalog-language out-of-scope symptoms (Tier 3) and completely redesigned the UX of the neuro-symbolic verification fallback message to be more empathetic, less robotic, and fully bilingual.

### Problem Statement

1. **Tier 3 Detection Gap (Tagalog):** A user input with conversational, morphologically complex Tagalog STI symptoms (e.g., *"Doc, medyo nahihiya po ako pero... makapal na discharge sa ari ko... Mahapdi din po talaga kapag umiihi ako, parang may burning sensation"*) failed to trigger a Tier 3 referral. The system only mapped `"may discharge sa ari"` but missed the dysuria component because the specific conversational phrases weren't in the exact/fuzzy matching dictionary. Since Tier 3 requires 2+ concepts to trigger a referral, the input fell through to the ML classifier, which confusingly predicted "Influenza".
2. **Poor UX in Fallback Message:** When the system caught the anomaly during Tier 2 neuro-symbolic verification, it returned a highly robotic and invalidating message in English only (*"Your symptoms partially match influenza, but some of what you described does not fully fit..."*), completely ignoring the user's primary language.

### Solution Overview

1. **Expanded Phrase Dictionary:** Added specific Tagalog conversational phrases and common English/Taglish descriptors for STI symptoms to `UNRELATED_CATEGORY_CONCEPTS` to ensure robust 2+ concept detection.
2. **Empathetic Bilingual UX:** Rewrote the `CONFLICTING_MATCH` message to validate the user's experience and provide localized (English or Tagalog) responses based on language detection.

---

## Changes Made

### 1. Expanded Tier 3 Phrase Dictionary (`backend/app/config.py`)

Added common conversational symptom descriptions to `UNRELATED_CATEGORY_CONCEPTS`.

**Added for `SX_DYSURIA`:**
- `"mahapdi kapag umiihi"`
- `"burning sensation"`

**Added for `SX_GENITAL_DISCHARGE`:**
- `"discharge sa ari"`
- `"yellowish discharge"`

### 2. Improved Conflicting Match UX (`backend/app/api/diagnosis.py`)

Redesigned the `_build_conflicting_match_message` function to accept a `lang` parameter and return empathetic, localized text.

**Before:**
```python
def _build_conflicting_match_message(predicted_disease):
    condition = _format_condition_name(predicted_disease)
    return (
        f"Your symptoms partially match {condition}, but some of what you described does not fully fit this condition. "
        "Because of this mismatch, this result is not reliable enough to confirm. "
        "Please consult a healthcare professional for a proper evaluation."
    )
```

**After:**
```python
def _build_conflicting_match_message(predicted_disease, lang="en"):
    """Message for partial match with verification conflict."""
    condition = _format_condition_name(predicted_disease)
    if lang == "tl":
        return (
            f"Kahit may ilang sintomas ka na kapareho ng {condition}, may nabanggit kang ibang palatandaan "
            "na posibleng ibang kondisyon. Para sa iyong kaligtasan at upang makasiguro, mangyaring kumonsulta "
            "sa isang doktor para masuri ang mga sintomas na ito nang maayos."
        )
    return (
        f"While some of your symptoms share similarities with {condition}, you mentioned other specific signs "
        "that point to something else. For your safety and to get an accurate assessment, please consult a "
        "healthcare professional. They can properly evaluate these unique symptoms."
    )
```

Updated the calling locations in `new_case()` and `follow_up_question()` to pass the dynamically detected language:
```python
conflicting_match_message = _build_conflicting_match_message(
    pred, lang=lang_for_prescreening # or sess.get("lang", "en")
)
```

---

## Testing & Verification

### Test 1: Tagalog Tier 3 Detection
**Input:** *"Doc, medyo nahihiya po ako pero napansin ko kasi ilang araw na may lumalabas na parang makapal na discharge sa ari ko, medyo yellowish at mabaho. Mahapdi din po talaga kapag umiihi ako, parang may burning sensation na hindi nawawala..."*

**Result:** ✅ **PASS**. The system correctly extracts `['SX_DYSURIA', 'SX_GENITAL_DISCHARGE']`, recognizes 2+ concepts in the `STI_GENITOURINARY` category, and triggers an immediate Tier 3 referral without running ML inference.

### Test 2: Bilingual Fallback UX
**Scenario:** A user submits a query that bypasses Tier 3 but fails Tier 2 verification (e.g., in-scope symptoms mixed with out-of-scope mimicker symptoms), using Tagalog text.

**Result:** ✅ **PASS**. The user receives the newly formatted Tagalog fallback message rather than the robotic English text, creating a much better, safer clinical UX.

---

## Security & Safety Impact

- **Clinical Safety:** Prevented a dangerous edge case where complexly phrased Tagalog STI symptoms were diagnosed as a respiratory infection.
- **User Trust:** Using an empathetic, native-language message prevents the user from feeling alienated or confused by sudden English technical jargon when their consultation is in Tagalog.

---

**Status:** Implemented  
**Rollout:** Active in development/production environments