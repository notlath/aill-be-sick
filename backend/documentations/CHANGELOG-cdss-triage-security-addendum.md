# Security Addendum: CDSS Triage UX Improvements

**Date:** March 25, 2026  
**Review Type:** Clinical Safety & Security Assessment  
**Reviewer:** cybersecurity-analyst skill  
**Risk Level:** MODERATE - Requires mitigation before production  

---

## Executive Summary

A comprehensive security and safety review was conducted on the CDSS Triage UX Improvements. While the changes provide clinical value by ensuring users always receive care guidance, several patient safety risks were identified that require mitigation before production deployment.

**Key Finding:** The system computes triage based on **model confidence/uncertainty**, NOT clinical severity. This creates potential for misinterpretation.

---

## Critical Findings

### C1: Triage Level Computation May Not Reflect Clinical Severity

**Severity:** 🔴 CRITICAL  
**Location:** `backend/app/utils/__init__.py` lines 155-217

**Issue:** Triage levels are determined by model metrics, not clinical urgency:

| Scenario | Model Metrics | Triage Assigned | Clinical Risk |
|----------|--------------|-----------------|---------------|
| Clear mild condition (common cold) | High confidence, low uncertainty | Low Priority (Green) | ✅ Appropriate |
| Unclear serious condition (early sepsis) | Low confidence, high uncertainty | High Priority (Red) | ✅ Appropriate |
| **Unclear mild condition** (atypical viral illness) | Low confidence, high uncertainty | High Priority (Red) | ⚠️ May cause unnecessary alarm |
| **Clear serious condition** (textbook pneumonia) | High confidence, low uncertainty | Low Priority (Green) | 🔴 **May delay critical care** |

**Example Failure Mode:**
```
Patient: Early meningococcemia with non-specific symptoms
Model: Low confidence (unusual presentation)
Triage: High Priority (due to uncertainty)
Risk: Patient may not seek immediate care because "High Priority" 
      is based on AI uncertainty, not clinical severity
```

**Recommended Mitigation:**
```python
# Add to backend/app/utils/__init__.py

RED_FLAG_KEYWORDS = [
    "chest pain", "difficulty breathing", "confusion", 
    "unconscious", "severe headache", "stiff neck",
    "cannot wake up", "bluish lips"
]

# After triage determination
symptoms_lower = symptoms.lower()
if any(kw in symptoms_lower for kw in RED_FLAG_KEYWORDS):
    if triage_level != "High Priority":
        triage_level = "High Priority"
        triage_reasons.insert(0, "⚠️ Symptom keywords indicate potential emergency - seek immediate care")
```

---

### C2: Color Badges May Be Misinterpreted as Clinical Severity

**Severity:** 🟡 HIGH  
**Location:** `frontend/components/patient/diagnosis-page/cdss-summary.tsx` lines 63-99

**Issue:** Users may interpret colors as emergency level rather than care setting:

| Badge | Intended Meaning | Potential Misinterpretation |
|-------|-----------------|----------------------------|
| 🔴 Red | "Model uncertain, see doctor" | "This is an emergency!" or "I'm very sick" |
| 🟢 Green | "Safe for home care" | "I'm fine, no need to see anyone" |

**Evidence:**
```typescript
// Current implementation
case "HIGH PRIORITY":
  return {
    badgeClass: "badge-error",  // Red = error/danger
    // ...
  };
```

**Recommended Mitigation:**
```typescript
// Option 1: Change badge labeling
<span className={`badge badge-lg ${triage.badgeClass}`}>
  {triage.level} → {triage.level} (AI Uncertain)
</span>

// Option 2: Add clarifying subtitle
<div className="triage-badge">
  <span className={badgeClass}>{triage.label}</span>
  <p className="triage-clarification">
    Based on AI uncertainty level, not symptom severity
  </p>
</div>
```

---

### C3: Disclaimer Insufficiently Prominent

**Severity:** 🟡 HIGH  
**Location:** `frontend/components/patient/diagnosis-page/cdss-summary.tsx` lines 558-562

**Current Implementation:**
```typescript
<footer className="px-6 py-3 bg-primary/5 border-t border-primary/20 text-center">
  <p className="text-[11px] text-primary/70 leading-relaxed italic">
    This summary supports clinical decision-making and does not replace professional medical judgment.
  </p>
</footer>
```

**Issues:**
- 11px font size (barely readable on mobile)
- Low contrast (`text-primary/70` = 70% opacity)
- Footer placement (easily overlooked)
- Appears after all actionable content

**WHO Compliance Issue:** Per WHO AI in Health guidelines, disclaimers should be **prominent and proximate** to recommendations.

**Recommended Mitigation:**
```typescript
// Move disclaimer to top of card, after header
<div className="px-6 py-3 bg-amber-50 border-b border-amber-200">
  <p className="text-xs text-amber-900 font-medium">
    <AlertTriangle className="inline w-3 h-3 mr-1" />
    This is an AI-assisted screening tool, not a diagnosis. 
    Always consult a healthcare professional for medical advice.
  </p>
</div>
```

---

## High Priority Findings

### H1: Automation Bias Risk from Polished UI

**Severity:** 🟡 HIGH

**Issue:** Professional UI design may induce over-reliance on AI recommendations.

**Visual Hierarchy Analysis:**
```
┌─────────────────────────────────────────┐
│ [Professional Icon] Clinical Support    │ ← Authority signal
│ AI-assisted decision support            │ ← "AI" adds credibility
├─────────────────────────────────────────┤
│ ⚠️ Warning (user may skip)              │
├─────────────────────────────────────────┤
│ 🛡️ HIGH PRIORITY [Large Red Badge]     │ ← Most prominent
│    Seek medical attention promptly      │ ← Directive language
├─────────────────────────────────────────┤
│ Numbered action steps                   │ ← Sounds authoritative
│ 1. Consult healthcare professional...   │
│ 2. Physician evaluation required...     │
│ 3. Consider diagnostic tests...         │
└─────────────────────────────────────────┘
```

**Risk:** Users may:
1. Overweight triage recommendation
2. Underweight uncertainty warning
3. Not seek second opinions

**Recommended Mitigation:**
- Add explicit "This is screening, not diagnosis" language
- Include symptom severity self-assessment prompt
- Add "When to seek immediate care" section regardless of triage

---

### H2: No Audit Trail for Triage Determinations

**Severity:** 🟡 HIGH

**Issue:** No logging of triage decisions for safety monitoring or incident investigation.

**Recommended Mitigation:**
```python
# Add to backend/app/api/diagnosis.py or _build_cdss_payload

import logging
logger = logging.getLogger(__name__)

# After triage determination
logger.info(
    f"[TRIAGE_AUDIT] session_id={session_id} "
    f"disease={disease} confidence={confidence:.3f} "
    f"uncertainty={uncertainty:.3f} triage_level={triage_level} "
    f"is_valid={is_valid} reasons={triage_reasons}"
)
```

---

### H3: Missing "Red Flag" Symptom Escalation

**Severity:** 🟡 HIGH

**Issue:** System does not override triage for dangerous symptoms.

**Example Failure Mode:**
```
Patient: "I have chest pain and shortness of breath"
Model: Confidence 85%, Uncertainty 4%
Triage: Medium Priority (based on metrics)
Risk: Chest pain should always be High Priority regardless of model confidence
```

**Recommended Mitigation:**
See C1 mitigation (red flag keyword detection)

---

## Medium Priority Findings

### M1: Differential Diagnosis May Cause Anxiety

**Severity:** 🟠 MEDIUM

**Issue:** Showing probability bars for multiple conditions may cause patients to:
- Fixate on serious conditions with low probabilities
- Self-misdiagnose ("The AI listed pneumonia, I must have it")

**Example:**
```
Differential Diagnosis:
┌─────────────────────────────┐
│ Influenza      ████████░░ 80% │
│ Pneumonia      ██░░░░░░░░ 20% │  ← Patient panics
│ Dengue         █░░░░░░░░░ 10% │  ← Unnecessary worry
└─────────────────────────────┘
```

**Recommended Mitigation:**
- Hide differential for unable-to-diagnose cases
- Add explanatory text: "These are possibilities, not diagnoses"
- Consider showing only top 3 conditions

---

### M2: Knowledge Links May Mislead for Uncertain Cases

**Severity:** 🟠 MEDIUM

**Location:** `backend/app/utils/__init__.py` lines 240-280

**Issue:** When `is_valid=False`, system still shows disease-specific knowledge links based on top prediction, which may be incorrect.

**Recommended Mitigation:**
```python
# Modify knowledge selection for uncertain cases
if is_uncertain:
    knowledge = [
        {
            "topic": "General symptom assessment",
            "source": "WHO",
            "link": "https://www.who.int/health-topics",
        },
        {
            "topic": "When to seek medical care",
            "source": "CDC",
            "link": "https://www.cdc.gov/urgent-care.html",
        },
    ]
else:
    knowledge = _KNOWLEDGE_BY_DISEASE.get(disease, [...])
```

---

## Regulatory Considerations

### FDA Classification Risk

**Finding:** Current implementation may qualify as **Class II medical device** under FDA guidance because:

1. ✅ Provides triage recommendations (clinical decision-making)
2. ✅ Direct-to-patient without mandatory HCP review
3. ✅ Uses AI/ML for analysis

**Implication:** May require 510(k) clearance before commercial deployment.

**Recommended Action:** Consult regulatory counsel regarding:
- FDA classification determination
- 510(k) premarket notification requirements
- Substantial equivalence to predicate devices

### Liability Exposure

**Risk:** If patient receives "Low Priority" but has serious condition, system operators could face liability.

**Mitigation Strategy:**
1. ✅ Strengthen disclaimers (see C3)
2. ⏳ Add terms of service acknowledgment
3. ⏳ Implement safety monitoring and incident reporting
4. ⏳ Consider HCP-only access for triage features

---

## Positive Findings

### ✅ Appropriate Uncertainty Communication

The dual warning system correctly distinguishes:
- **Red banner** (`isValid=False`): "AI couldn't diagnose"
- **Yellow banner** (`isValid=True` but low confidence): "AI diagnosed with uncertainty"

### ✅ Authoritative Knowledge Sources

All knowledge links point to WHO and CDC, ensuring reliable health information.

### ✅ Actionable Guidance

Triage recommendations include specific care setting and numbered action steps.

---

## Implementation Priority

### Before Production (Required)

| ID | Finding | Effort | Impact |
|----|---------|--------|--------|
| C1 | Add red flag symptom escalation | Low | High |
| C2 | Clarify triage badge meaning | Low | Medium |
| C3 | Enhance disclaimer prominence | Low | High |

### Within 2 Sprints (Recommended)

| ID | Finding | Effort | Impact |
|----|---------|--------|--------|
| H1 | Add symptom severity self-assessment | Medium | Medium |
| H2 | Implement audit logging | Low | Medium |
| H3 | Add "when to seek immediate care" section | Low | High |

### Within 1 Month (Considered)

| ID | Finding | Effort | Impact |
|----|---------|--------|--------|
| M1 | Modify differential display for uncertain cases | Low | Low |
| M2 | Change knowledge links for uncertain cases | Low | Low |
| - | User comprehension testing | High | High |
| - | Safety monitoring dashboard | High | Medium |

---

## Success Criteria for Mitigation

- [ ] All CRITICAL findings addressed
- [ ] All HIGH findings addressed or accepted with documented rationale
- [ ] MEDIUM findings reviewed and prioritized
- [ ] Clinical safety review completed by qualified healthcare professional
- [ ] Legal/regulatory review completed
- [ ] User testing validates comprehension of triage meaning
- [ ] Audit logging captures all triage determinations
- [ ] Incident response process established for triage-related complaints

---

## Conclusion

The CDSS Triage UX Improvements provide meaningful clinical value by ensuring users always receive care guidance. However, the current implementation has patient safety risks that must be mitigated before production deployment.

**Recommended Action:** Implement C1, C2, C3 mitigations before production release. Complete H1, H2, H3 within 2 sprints post-launch.

**Overall Risk Assessment:** MODERATE - Acceptable with mitigations

---

**Review Status:** ✅ Complete  
**Next Steps:** Clinical review, mitigation implementation, production readiness assessment
