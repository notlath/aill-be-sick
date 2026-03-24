# CHANGELOG: Remove Keyword-Based Red Flag Detection

**Date:** 2026-03-24  
**Type:** Breaking Change / Patient Safety Improvement  
**Scope:** Backend API, Frontend UI

---

## Summary

Removed the keyword-based "red flag" detection system from the CDSS (Clinical Decision Support System). This system was flagging common symptom keywords (e.g., "difficulty breathing", "chest pain") as emergent conditions without clinical validation, which posed several patient safety and usability risks.

---

## Rationale

The previous implementation used simple regex/string matching to detect "red flags" in user-reported symptoms and automatically:

1. Escalated triage level to **"Emergent"**
2. Recommended **"Emergency Room"** as the care setting
3. Displayed alarming **"Warning signs detected"** badges to patients

### Problems with This Approach

| Issue | Impact |
|-------|--------|
| **Alert fatigue** | Clinicians ignore warnings when everything is flagged as urgent |
| **Unnecessary panic** | Patients think they need ER when they may not |
| **Resource waste** | Emergency rooms get flooded with non-emergent cases |
| **Loss of trust** | CDSS becomes unreliable for actual triage |
| **No medical basis** | Keyword matching cannot assess clinical context or severity |

A CDSS should not autonomously label symptoms as emergent without clinician review. Triage decisions must be based on validated clinical criteria, not arbitrary keyword matches.

---

## Files Changed

### Backend

| File | Changes |
|------|---------|
| `backend/app/utils/__init__.py` | Removed `_detect_red_flags()` function (64 lines), removed from `__all__` exports, refactored `_build_cdss_payload()` to remove red-flag-based triage escalation, removed `red_flags` key from payload |

### Frontend

| File | Changes |
|------|---------|
| `frontend/components/patient/diagnosis-page/cdss-summary.tsx` | Removed `red_flags?: string[]` from `CDSSPayload` type, removed "Warning signs detected" UI section (24 lines) |

---

## Technical Details

### Backend: `_build_cdss_payload()` Refactor

**Before:**
```python
def _build_cdss_payload(...):
    red_flags = _detect_red_flags(symptoms)
    
    if red_flags:
        triage_level = "Emergent"
        triage_reasons = ["One or more red flags present"] + red_flags
        care_setting = "Emergency Room"
        # ...
    else:
        # confidence/uncertainty-based logic
```

**After:**
```python
def _build_cdss_payload(...):
    # Triage determination based on model confidence/uncertainty only
    if (
        confidence >= config.TRIAGE_HIGH_CONFIDENCE
        and uncertainty <= config.TRIAGE_LOW_UNCERTAINTY
    ):
        triage_level = "Non-urgent"
        # ...
    else:
        triage_level = "Urgent"
        # ...
```

### API Payload Change

The `red_flags` key has been removed from the CDSS API response:

**Before:**
```json
{
  "differential": [...],
  "triage": { "level": "Emergent", "reasons": ["One or more red flags present", "Respiratory difficulty"] },
  "red_flags": ["Respiratory difficulty"],
  "recommendation": {...}
}
```

**After:**
```json
{
  "differential": [...],
  "triage": { "level": "Urgent", "reasons": ["Model requires clinician review due to confidence/uncertainty"] },
  "recommendation": {...}
}
```

---

## Migration Notes

- **API Consumers:** If any external service consumes the `red_flags` field from the CDSS payload, it will now be absent. Update client code to handle missing field gracefully.
- **Triage Levels:** The "Emergent" triage level is no longer automatically assigned. Triage now follows a two-tier system:
  - `Non-urgent`: High confidence + low uncertainty
  - `Urgent`: Everything else (requires clinician review)

---

## Testing

- [x] TypeScript type check passes (`npx tsc --noEmit`)
- [x] No references to `red_flags` remain in active frontend code
- [x] Backend `_detect_red_flags` function fully removed

---

## Related Documentation

- `frontend/documentations/CHANGELOG-redesign-diagnosis-ux.md` — Previous UX changes that introduced the red flags UI
- `frontend/documentations/PR-UX-Copywriting.md` — Copywriting guidelines for clinical messaging

---

## Authors

- AI-assisted refactoring with human review
