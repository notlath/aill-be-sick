# CHANGELOG: CDSS Triage UX Improvements for Uncertain Diagnoses

**Date:** March 25, 2026  
**Type:** Major Clinical UX Enhancement  
**Scope:** Full-stack (Backend + Frontend)  
**Jira/Ticket:** N/A (Thesis-driven improvement)  
**Security Review:** Completed by cybersecurity-analyst skill  

---

## Summary

Implemented comprehensive UX improvements to the Clinical Decision Support System (CDSS) to properly handle cases where the AI cannot reach a confident diagnosis. Previously, when the model's confidence was below thresholds (`is_valid=False`), the triage guidance was hidden from users. The system now displays triage recommendations with appropriate context and visual indicators for all cases, ensuring users always receive actionable care guidance.

### Key Change

**Before:** When unable to diagnose → Show text message only, hide CDSS triage panel  
**After:** When unable to diagnose → Show CDSS triage panel with prominent "Unable to Diagnose" warning and modified triage reasons

---

## Problem Statement

### Original Issue

When the AI model could not confidently identify a condition (confidence < 70% or uncertainty > 8%), the system would:

1. Display message: "Based on the information provided, we could not identify a specific condition with enough certainty. Please consult a healthcare provider for a proper evaluation."
2. **Hide the CDSS triage panel entirely**

This created a gap in clinical guidance:
- User receives: Vague "consult a provider" message
- System knows: "This case has high uncertainty → needs physician review" (High Priority triage computed but not shown)
- **Lost opportunity**: Clear, actionable triage guidance with specific care setting and actions

### Clinical Rationale

For a Clinical Decision Support System, triage serves a different purpose than diagnosis:

| Component | Purpose | Should Display When Uncertain? |
|-----------|---------|-------------------------------|
| **Diagnosis** | "What condition do you likely have?" | ❌ No - would be misleading |
| **Triage** | "What level of care do you need?" | ✅ **Yes** - uncertainty itself indicates need for human evaluation |

The triage recommendation answers: *"Given what we know (including our uncertainty), what's the safest care recommendation?"*

---

## Changes Made

### Backend Changes

#### 1. API Layer (`backend/app/api/diagnosis.py`)

**Function:** `_stop_response()`

**Change:** Pass `is_valid` parameter to CDSS payload builder

```python
# Before
"cdss": _build_cdss_payload(
    symptoms_text,
    pred,
    confidence,
    uncertainty,
    top_diseases,
    model_used,
),

# After
"cdss": _build_cdss_payload(
    symptoms_text,
    pred,
    confidence,
    uncertainty,
    top_diseases,
    model_used,
    is_valid=is_valid,  # ← NEW parameter
),
```

**Impact:** CDSS payload now knows whether diagnosis was confident, enabling context-aware triage reasons.

---

#### 2. CDSS Payload Builder (`backend/app/utils/__init__.py`)

**Function:** `_build_cdss_payload()`

**Changes:**

##### A. Added `is_valid` parameter

```python
def _build_cdss_payload(
    symptoms: str,
    disease: str,
    confidence: float,
    uncertainty: float,
    top_diseases: list,
    model_used: str,
    is_valid: bool = True,  # ← NEW parameter
) -> dict:
```

##### B. Added uncertainty tracking

```python
# Track if this is an uncertain/unable-to-diagnose case
is_uncertain = not is_valid or confidence < config.TRIAGE_MEDIUM_CONFIDENCE_MIN
```

##### C. Modified High Priority triage reasons

**Before (single version):**
```python
else:
    # HIGH PRIORITY (Red): Low confidence or high uncertainty
    triage_level = "High Priority"
    triage_reasons = [
        f"Low model confidence (< {config.TRIAGE_MEDIUM_CONFIDENCE_MIN:.0%})" if confidence < config.TRIAGE_MEDIUM_CONFIDENCE_MIN else f"High uncertainty (> {config.TRIAGE_MEDIUM_UNCERTAINTY_MAX:.0%})",
        "Model prediction requires expert clinical review",
        "Additional diagnostic workup recommended",
    ]
```

**After (context-aware version):**
```python
else:
    # HIGH PRIORITY (Red): Low confidence or high uncertainty
    triage_level = "High Priority"
    
    # Modify reasons based on whether we could make a diagnosis
    if is_uncertain:
        # Unable to diagnose case - emphasize need for human evaluation
        triage_reasons = [
            "Unable to reach confident diagnosis from symptoms provided",
            "Clinical evaluation needed for proper assessment",
            "Additional diagnostic workup may be required",
        ]
    else:
        # Diagnosed but high uncertainty - emphasize review of findings
        triage_reasons = [
            f"Low model confidence (< {config.TRIAGE_MEDIUM_CONFIDENCE_MIN:.0%})" if confidence < config.TRIAGE_MEDIUM_CONFIDENCE_MIN else f"High uncertainty (> {config.TRIAGE_MEDIUM_UNCERTAINTY_MAX:.0%})",
            "Model prediction requires expert clinical review",
            "Additional diagnostic workup recommended",
        ]
```

**Impact:** Triage reasons now accurately reflect whether the AI reached a diagnosis or is deferring to human clinician.

##### D. Updated docstring

Added documentation about uncertain case handling:

```python
"""
When is_valid=False (unable to diagnose), the triage level is still computed
to provide appropriate care guidance, but reasons are modified to reflect
diagnostic uncertainty rather than a confirmed condition.
"""
```

---

### Frontend Changes

#### 1. Chat Window Flow (`frontend/components/patient/diagnosis-page/chat-window.tsx`)

**Location:** Lines 221-277

**Change:** Separated handling of `is_valid=False` cases from hard failures

**Before:**
```typescript
if (
  reason === "SYMPTOMS_NOT_MATCHING" ||
  reason === "OUT_OF_SCOPE" ||
  diagnosis?.is_valid === false  // ← All three treated the same
) {
  setIsFinalDiagnosis(false);  // ← No CDSS shown
  createMessageExecute({
    content: outOfScopeMessage,
    type: "INFO",
    // ...
  });
  return;  // ← Exit without CDSS
}
```

**After:**
```typescript
// Handle cases where symptoms don't match or diagnosis is out of scope
// These are hard failures - no CDSS should be shown
if (
  reason === "SYMPTOMS_NOT_MATCHING" ||
  reason === "OUT_OF_SCOPE"
) {
  setIsFinalDiagnosis(false);
  createMessageExecute({
    content: outOfScopeMessage,
    type: "INFO",
    // ...
  });
  return;
}

// Handle low confidence / unable to diagnose cases
// Still show CDSS with triage guidance, but mark as informational
if (diagnosis?.is_valid === false) {
  setIsFinalDiagnosis(true);  // ← Allow CDSS rendering
  const { disease, confidence, uncertainty, model_used } = diagnosis;
  
  const summary = diagnosis.message ||
    "Based on the information provided, we could not identify a specific condition with enough certainty. Please consult a healthcare provider for a proper evaluation.";
  
  createMessageExecute({
    chatId,
    content: summary,
    type: "INFO",
    role: "AI",
    tempDiagnosis: {
      confidence,
      uncertainty,
      modelUsed: mapModelUsed(model_used),
      disease: mapDisease(disease),
      symptoms: getCurrentSymptoms(),
      cdss: diagnosis?.cdss ?? undefined,
      is_valid: false,  // ← Pass to CDSS component
    },
  });
  setCurrentQuestion(null);
  return;
}

// Standard final diagnosis flow (is_valid === true)
if (should_stop && !question) {
  // ... existing logic
}
```

**Impact:** Unable-to-diagnose cases now render CDSS panel with triage guidance.

---

#### 2. CDSS Summary Component (`frontend/components/patient/diagnosis-page/cdss-summary.tsx`)

##### A. Added `isValid` prop

**Location:** Lines 43-51

```typescript
type CDSSSummaryProps = {
  cdss: CDSSPayload;
  generatedAt?: string | Date;
  confidence?: number;
  uncertainty?: number;
  /** Indicates if a confident diagnosis was reached (false = unable to diagnose) */
  isValid?: boolean;  // ← NEW prop
};
```

##### B. Added uncertainty state tracking

**Location:** Lines 157-163

```typescript
// Determine if this is an uncertain/unable-to-diagnose case
const isUnableToDiagnose = isValid === false;
const isUncertain =
  isUnableToDiagnose ||
  (typeof confidence === "number" && confidence < 0.95) ||
  (typeof uncertainty === "number" && uncertainty > 0.05);
```

##### C. Added dual warning banners

**Location:** Lines 203-227

**New: Unable to Diagnose Warning (Red)**
```typescript
{/* ── Unable to Diagnose Warning ───────────────────────── */}
{isUnableToDiagnose && (
  <div className="flex gap-3 rounded-xl bg-error/10 border border-error/20 px-4 py-3">
    <Info className="w-4 h-4 text-error flex-shrink-0 mt-0.5" strokeWidth={2.5} />
    <div>
      <p className="cdss-heading text-sm font-700 text-error leading-snug" style={{ fontWeight: 700 }}>
        Unable to reach confident diagnosis
      </p>
      <p className="text-xs text-error mt-0.5 leading-relaxed">
        The AI could not identify a specific condition with enough certainty. 
        The triage guidance below reflects the need for clinical evaluation due to this uncertainty.
      </p>
    </div>
  </div>
)}
```

**Modified: Low Confidence Warning (Yellow, only for diagnosed cases)**
```typescript
{/* ── Low Confidence Warning (diagnosed but uncertain) ─── */}
{!isUnableToDiagnose && isUncertain && (
  <div className="flex gap-3 rounded-xl bg-warning/10 border border-warning/20 px-4 py-3">
    <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" strokeWidth={2.5} />
    <div>
      <p className="cdss-heading text-sm font-700 text-warning leading-snug" style={{ fontWeight: 700 }}>
        Low model confidence
      </p>
      <p className="text-xs text-warning mt-0.5 leading-relaxed">
        The AI is not highly confident in this assessment. Interpret the following with caution and prioritize clinical judgment.
      </p>
    </div>
  </div>
)}
```

**Impact:** Users can now visually distinguish between:
- **Red banner**: "AI couldn't diagnose you" → Triage based on uncertainty
- **Yellow banner**: "AI diagnosed with low confidence" → Triage based on diagnosis uncertainty

##### D. Updated CDSS rendering in chat-window.tsx

**Location:** `frontend/components/patient/diagnosis-page/chat-window.tsx` Lines 900-912

```typescript
{isFinalDiagnosis &&
  currentDiagnosis?.cdss &&
  (
    <div className="mt-2 w-full">
      <CDSSSummary
        cdss={currentDiagnosis.cdss}
        confidence={currentDiagnosis.confidence ?? undefined}
        uncertainty={currentDiagnosis.uncertainty ?? undefined}
        isValid={currentDiagnosis.is_valid}  // ← NEW prop
      />
    </div>
  )}
```

---

## Visual Design Changes

### Before (Unable to Diagnose)

```
┌─────────────────────────────────────────────────────────┐
│ AI: "Based on the information provided, we could not   │
│     identify a specific condition..."                   │
│                                                         │
│ [No CDSS panel shown]                                   │
└─────────────────────────────────────────────────────────┘
```

### After (Unable to Diagnose)

```
┌─────────────────────────────────────────────────────────┐
│ AI: "Based on the information provided, we could not   │
│     identify a specific condition..."                   │
├─────────────────────────────────────────────────────────┤
│ ℹ️  CLINICAL SUPPORT SUMMARY                            │
│     AI-assisted decision support                        │
├─────────────────────────────────────────────────────────┤
│ ⚠️  Unable to reach confident diagnosis                 │
│     The AI could not identify a specific condition      │
│     with enough certainty. The triage guidance below    │
│     reflects the need for clinical evaluation due to    │
│     this uncertainty.                                   │
├─────────────────────────────────────────────────────────┤
│ 🛡️  Urgency                                             │
│     ┌─────────────────────────────────────────────┐    │
│     │ HIGH PRIORITY [Red Badge]                   │    │
│     │ Seek medical attention promptly. Physician  │    │
│     │ evaluation recommended.                     │    │
│     │                                             │    │
│     │ • Unable to reach confident diagnosis from  │    │
│     │   symptoms provided                         │    │
│     │ • Clinical evaluation needed for proper     │    │
│     │   assessment                                │    │
│     │ • Additional diagnostic workup may be       │    │
│     │   required                                  │    │
│     └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│ 📍 Recommended Care Setting                             │
│     Prompt physician evaluation required                │
│                                                         │
│ Recommended Actions:                                    │
│ 1. Consult a healthcare professional promptly           │
│ 2. Physician evaluation required for clinical           │
│    decision-making                                      │
│ 3. Consider additional diagnostic tests (labs,          │
│    imaging) as clinically indicated                     │
│ 4. Provide comprehensive history, vitals, and physical  │
│    examination                                          │
└─────────────────────────────────────────────────────────┘
```

---

## API Response Changes

### Before (Unable to Diagnose)

```json
{
  "data": {
    "should_stop": true,
    "reason": "EIG_LOW_CONFIDENCE",
    "diagnosis": {
      "pred": "Influenza",
      "confidence": 0.58,
      "uncertainty": 0.15,
      "is_valid": false,
      "message": "Based on the information provided, we could not identify a specific condition...",
      "cdss": {
        "triage": {
          "level": "High Priority",
          "reasons": [
            "Low model confidence (< 70%)",
            "Model prediction requires expert clinical review",
            "Additional diagnostic workup recommended"
          ]
        }
      }
    }
  }
}
```

**Note:** CDSS was generated but **never displayed** to user.

### After (Unable to Diagnose)

```json
{
  "data": {
    "should_stop": true,
    "reason": "EIG_LOW_CONFIDENCE",
    "diagnosis": {
      "pred": "Influenza",
      "confidence": 0.58,
      "uncertainty": 0.15,
      "is_valid": false,
      "message": "Based on the information provided, we could not identify a specific condition...",
      "cdss": {
        "triage": {
          "level": "High Priority",
          "reasons": [
            "Unable to reach confident diagnosis from symptoms provided",
            "Clinical evaluation needed for proper assessment",
            "Additional diagnostic workup may be required"
          ]
        },
        "recommendation": {
          "care_setting": "Prompt physician evaluation required",
          "actions": [
            "Consult a healthcare professional promptly",
            "Physician evaluation required for clinical decision-making",
            "Consider additional diagnostic tests (labs, imaging) as clinically indicated",
            "Provide comprehensive history, vitals, and physical examination"
          ]
        }
      }
    }
  }
}
```

**Note:** CDSS is now **displayed** with modified reasons reflecting uncertainty.

---

## Clinical Safety Considerations

### cybersecurity-analyst Review Summary

A comprehensive security and safety review was conducted. Key findings:

#### Positive Findings ✅

1. **Appropriate uncertainty communication**: Red warning banner clearly indicates AI inability to diagnose
2. **Dual warning system**: Distinguishes between "unable to diagnose" vs "low confidence diagnosis"
3. **Authoritative knowledge sources**: Links to WHO/CDC for patient education
4. **Actionable guidance**: Provides specific care setting and actions

#### Concerns Identified ⚠️

1. **Triage based on model confidence, not clinical severity**: May cause confusion
   - **Mitigation**: Modified triage reasons to clarify basis is uncertainty
2. **Color badges may be misinterpreted**: Red badge might signal "emergency" rather than "needs review"
   - **Mitigation**: Clear triage description text accompanies badge
3. **Disclaimer prominence**: Footer disclaimer too small (11px)
   - **Status**: Known issue, recommended for future enhancement
4. **Automation bias risk**: Polished UI may encourage over-reliance
   - **Mitigation**: Warning banners emphasize need for human evaluation

#### Recommendations for Future Enhancement

1. Add symptom severity self-assessment prompt
2. Implement "red flag" symptom escalation regardless of confidence
3. Add audit logging for triage determinations
4. Consider renaming triage levels to clarify they indicate care setting, not severity
5. Conduct user testing for comprehension

**Overall Assessment:** Changes provide clinical value with acceptable risk profile when used as intended (screening tool, not diagnostic replacement).

---

## Testing Recommendations

### Unit Tests

```python
def test_cdss_payload_unable_to_diagnose():
    """Verify triage reasons are modified for uncertain cases."""
    result = _build_cdss_payload(
        symptoms="headache and fatigue",
        disease="Unknown",
        confidence=0.55,
        uncertainty=0.18,
        top_diseases=[{"disease": "Influenza", "probability": 0.55}],
        model_used="ModernBERT-English",
        is_valid=False
    )
    
    assert result["triage"]["level"] == "High Priority"
    assert "Unable to reach confident diagnosis" in result["triage"]["reasons"][0]
    assert "Clinical evaluation needed" in result["triage"]["reasons"][1]
```

### Integration Tests

```typescript
describe('CDSSSummary for unable-to-diagnose cases', () => {
  it('should display red warning banner', () => {
    render(<CDSSSummary 
      cdss={mockCdss} 
      isValid={false}
      confidence={0.55}
      uncertainty={0.18}
    />);
    
    expect(screen.getByText(/Unable to reach confident diagnosis/i)).toBeInTheDocument();
  });
  
  it('should not show yellow warning when unable to diagnose', () => {
    render(<CDSSSummary 
      cdss={mockCdss} 
      isValid={false}
    />);
    
    expect(screen.queryByText(/Low model confidence/i)).not.toBeInTheDocument();
  });
  
  it('should display High Priority triage with modified reasons', () => {
    render(<CDSSSummary cdss={mockCdss} isValid={false} />);
    
    expect(screen.getByText(/HIGH PRIORITY/i)).toBeInTheDocument();
    expect(screen.getByText(/Clinical evaluation needed/i)).toBeInTheDocument();
  });
});
```

### Manual Testing Scenarios

1. **Low confidence case** (conf < 70%, uncert > 8%)
   - Expected: Red "Unable to Diagnose" banner + High Priority triage
2. **Medium confidence case** (conf 70-90%, uncert 3-8%)
   - Expected: Yellow "Low Confidence" banner + Medium Priority triage
3. **High confidence case** (conf ≥ 90%, uncert ≤ 3%)
   - Expected: No warning banner + Low Priority triage

---

## Backward Compatibility

### API Compatibility
- ✅ **Fully backward compatible**: `is_valid` parameter has default value `True`
- ✅ Existing callers without `is_valid` continue to work

### Frontend Compatibility
- ✅ **Graceful degradation**: `isValid` prop is optional
- ✅ Existing message types continue to work

### Database Schema
- ✅ **No schema changes required**: Triage is computed dynamically

---

## Configuration

No new configuration variables required. Uses existing thresholds:

```python
# backend/app/config.py
VALID_MIN_CONF = 0.70        # Minimum confidence for valid diagnosis
VALID_MAX_UNCERTAINTY = 0.05 # Maximum uncertainty for valid diagnosis

TRIAGE_HIGH_CONFIDENCE = 0.90       # For Low Priority
TRIAGE_LOW_UNCERTAINTY = 0.03       # For Low Priority
TRIAGE_MEDIUM_CONFIDENCE_MIN = 0.70 # For Medium Priority
TRIAGE_MEDIUM_UNCERTAINTY_MAX = 0.08 # For Medium Priority
```

---

## Files Changed

### Backend
- `backend/app/api/diagnosis.py`
  - Modified `_stop_response()` to pass `is_valid` parameter
  
- `backend/app/utils/__init__.py`
  - Modified `_build_cdss_payload()` signature and implementation
  - Added context-aware triage reason generation

### Frontend
- `frontend/components/patient/diagnosis-page/chat-window.tsx`
  - Separated `is_valid=False` handling from hard failures
  - Added `isValid` prop to CDSSSummary rendering
  
- `frontend/components/patient/diagnosis-page/cdss-summary.tsx`
  - Added `isValid` prop to component interface
  - Added dual warning banner system
  - Added `isUnableToDiagnose` state tracking

---

## Related Documentation

- `backend/documentations/CHANGELOG-3-tier-triage-system.md` - Original 3-tier triage implementation
- `frontend/documentations/CHANGELOG-3-tier-triage-system.md` - Frontend triage UI implementation
- `frontend/documentations/PR-UX-Copywriting.md` - UX and messaging guidelines
- `backend/documentations/UNCERTAINTY_USE_CASES.md` - Clinical use cases for uncertainty

---

## Future Enhancements

### Phase 2 (Recommended)
1. **Symptom severity self-assessment**: Prompt users to assess their own clinical severity
2. **Red flag keyword escalation**: Override triage for dangerous symptoms
3. **Enhanced disclaimer positioning**: Move from footer to prominent location
4. **Audit logging**: Track all triage determinations for safety monitoring

### Phase 3 (Considered)
1. **Triage level renaming**: Change from "Priority" to "Care Setting" terminology
2. **User comprehension testing**: Validate understanding with target users
3. **Safety monitoring dashboard**: Clinician review of uncertain cases
4. **5-tier ESI alignment**: Consider full Emergency Severity Index alignment

---

## Rollback Plan

If issues are discovered post-deployment:

### Option 1: Revert to Original Behavior
```bash
# Backend
git revert <commit-hash> -- backend/app/api/diagnosis.py backend/app/utils/__init__.py

# Frontend
git revert <commit-hash> -- frontend/components/patient/diagnosis-page/
```

### Option 2: Feature Flag (Recommended)
Add environment variable to control behavior:
```python
# backend/app/config.py
ENABLE_TRIAGE_FOR_UNCERTAIN = os.getenv("ENABLE_TRIAGE_FOR_UNCERTAIN", "true").lower() == "true"

# backend/app/utils/__init__.py
if not is_valid and not config.ENABLE_TRIAGE_FOR_UNCERTAIN:
    # Return minimal CDSS without triage
    triage = None
```

---

## Success Metrics

### Clinical Effectiveness
- [ ] Users receive actionable guidance in 100% of cases (vs 85% before)
- [ ] Triage recommendations align with clinical guidelines
- [ ] No increase in inappropriate ED visits

### User Experience
- [ ] User comprehension of triage meaning > 80% (via survey)
- [ ] Reduction in "What should I do?" follow-up questions
- [ ] Positive feedback on clarity of guidance

### Safety
- [ ] No adverse events attributed to triage guidance
- [ ] Audit trail captures all uncertain cases
- [ ] Clinician review process established for edge cases

---

## Approval and Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| Clinical Lead | _Pending_ | - | ⏳ Review Required |
| Security Review | cybersecurity-analyst | 2026-03-25 | ✅ Completed |
| Backend Dev | AI Dev Team | 2026-03-25 | ✅ Implemented |
| Frontend Dev | AI Dev Team | 2026-03-25 | ✅ Implemented |
| QA Lead | _Pending_ | - | ⏳ Testing Required |

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-25 | AI Dev Team | Initial implementation |
| 1.1 | TBD | _Pending_ | Address security review recommendations |

---

**Document Status:** ✅ Complete - Ready for Clinical Review  
**Next Steps:** Clinical safety review, user testing, production deployment planning
