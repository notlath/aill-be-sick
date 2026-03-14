# Uncertainty Improvements: Use Case Scenarios

## Overview

This document provides real-world use case scenarios demonstrating how the uncertainty quantification improvements enhance the AI disease prediction system's safety and reliability.

---

## Scenario 1: Emergency Triage - Dengue vs. Mild Viral Infection

### Context
A 28-year-old patient arrives at a rural clinic in the Philippines during dengue season with the following symptoms:

> "High fever for 2 days, severe headache, pain behind my eyes, body pain, feeling very weak"

### Before Improvements

```python
# Old system: Only confidence score
result = classifier.predict("High fever, headache, pain behind eyes, body pain")
# Output: {
#   "prediction": "Dengue",
#   "confidence": 0.72  # Looks acceptable, but is it reliable?
# }

# Problem: No way to know if the model is uncertain
# Decision: Might incorrectly triage as low-risk
```

**Issue:** The confidence of 72% seems acceptable, but the model might be making this prediction with high internal disagreement. The old system has no way to detect this.

### After Improvements

```python
from app.services.ml_service import compute_multi_metric_uncertainty

result = classifier.predict_with_uncertainty(symptoms)
uncertainty_metrics = compute_multi_metric_uncertainty(
    result["mean_probabilities"],
    result["mean_probabilities"][0],
    result["std_probabilities"][0]
)

# Output:
# {
#   "prediction": "Dengue",
#   "confidence": 0.72,
#   "mutual_information": 0.08,      # ⚠️ HIGH (threshold: 0.05)
#   "variance": 0.035,               # ⚠️ HIGH (threshold: 0.02)
#   "ensemble_disagreement": 0.42,   # ⚠️ HIGH (threshold: 0.20)
#   "coefficient_of_variation": 0.18 # ⚠️ HIGH (threshold: 0.15)
# }

# Multi-metric flagging triggers alert
if any([
    uncertainty_metrics["mutual_information"] > VALID_MAX_UNCERTAINTY,
    uncertainty_metrics["variance"] > VALID_MAX_VARIANCE,
    uncertainty_metrics["ensemble_disagreement"] > VALID_MAX_DISAGREEMENT
]):
    trigger_clinician_review()
```

**Result:** Despite 72% confidence, **4 uncertainty metrics flag this as unreliable**. The system correctly routes this to a clinician for review.

### Clinical Impact
- **Before:** Patient might be sent home with just paracetamol
- **After:** Clinician reviews, orders dengue NS1 test, patient gets proper monitoring
- **Outcome:** Early detection prevents progression to severe dengue

---

## Scenario 2: Calibration-Aware Decision Making

### Context
A public health clinic wants to use the AI system for initial screening. They need to trust that "90% confidence" actually means 90% accuracy.

### Before Improvements

```python
# Old system: No calibration validation
# System reports 90% confidence predictions
# Actual accuracy: Only 73% (unknown to users)
# Result: Overconfidence leads to misdiagnosis
```

**Issue:** The model is overconfident but nobody knows because there's no calibration measurement.

### After Improvements

```python
from app.services.ml_service import compute_expected_calibration_error

# Evaluate on validation set
ece = compute_expected_calibration_error(
    predictions=predicted_labels,
    confidences=confidence_scores,
    y_true=true_labels,
    n_bins=10
)

# Output: ECE = 0.17 (⚠️ POOR calibration)

# Reliability diagram shows:
# - 90% confidence bin → 73% actual accuracy
# - 80% confidence bin → 65% actual accuracy
# - Model is systematically overconfident

# Apply temperature scaling
from app.services.ml_service import apply_temperature_scaling, find_optimal_temperature

optimal_temp = find_optimal_temperature(logits, true_labels)
# Output: T = 1.8 (model needs significant softening)

calibrated_probs = apply_temperature_scaling(logits, temperature=1.8)

# After calibration:
# - ECE reduced from 0.17 to 0.04 ✓
# - 90% confidence now truly means ~90% accuracy ✓
```

### Clinical Impact
- **Before:** Doctors lose trust in system due to overconfidence
- **After:** Calibrated predictions enable reliable decision-making
- **Outcome:** System can be safely deployed for triage support

---

## Scenario 3: Outbreak Detection - Identifying Unusual Patterns

### Context
The surveillance system monitors disease patterns across regions. A sudden cluster of uncertain predictions in one area could indicate:
- A new disease variant
- An outbreak of an unmodeled disease
- Data quality issues

### Before Improvements

```python
# Old system: Only tracks predictions
# Cannot detect "uncertainty clusters"
# Misses early warning signals
```

### After Improvements

```python
from app.services.ml_service import compute_uncertainty_separation

# Monitor uncertainty by region
region_uncertainty = {
    "Manila": {"mean_mi": 0.02, "n_cases": 150},
    "Cebu": {"mean_mi": 0.03, "n_cases": 120},
    "Davao": {"mean_mi": 0.04, "n_cases": 100},
    "Palawan": {"mean_mi": 0.15, "n_cases": 45},  # ⚠️ ALERT
}

# Statistical anomaly detection
if region["mean_mi"] > global_mean + 2 * global_std:
    trigger_outbreak_investigation(region)

# Palawan investigation reveals:
# - Unusual symptom pattern not in training data
# - Possible new disease strain
# - Early containment measures implemented
```

### Clinical Impact
- **Before:** Outbreak detected weeks later through traditional reporting
- **After:** Uncertainty spike triggers immediate investigation
- **Outcome:** Early containment prevents widespread transmission

---

## Scenario 4: Follow-up Question Optimization

### Context
The system uses follow-up questions to refine diagnoses. Current approach asks questions in fixed order.

### Before Improvements

```python
# Fixed question order regardless of uncertainty
questions = [
    "Do you have fever?",
    "Do you have headache?",
    "Do you have body pain?",
    # ... asks all questions even if already confident
]
```

### Before Improvements

```python
# Fixed question order regardless of uncertainty
questions = [
    "Do you have fever?",
    "Do you have headache?",
    "Do you have body pain?",
    # ... asks all questions even if already confident
]
```

### After Improvements (Proposed)

```python
def select_next_question_with_uncertainty(current_symptoms, candidate_questions):
    """Select question that maximally reduces uncertainty"""
    
    current_uncertainty = compute_mi(current_symptoms)
    
    best_question = None
    max_uncertainty_reduction = 0
    
    for question in candidate_questions:
        # Simulate both possible answers
        yes_uncertainty = compute_mi(current_symptoms + [question])
        no_uncertainty = compute_mi(current_symptoms + [f"no {question}"])
        
        # Expected uncertainty reduction
        expected_reduction = current_uncertainty - (
            (yes_uncertainty + no_uncertainty) / 2
        )
        
        if expected_reduction > max_uncertainty_reduction:
            max_uncertainty_reduction = expected_reduction
            best_question = question
    
    return best_question

# Example:
# Patient: "Fever, headache"
# Current MI: 0.08 (high uncertainty)
# 
# Candidate questions evaluated:
# - "Pain behind eyes?" → Expected MI: 0.03 (reduction: 0.05) ✓ BEST
# - "Body pain?" → Expected MI: 0.06 (reduction: 0.02)
# - "Rash?" → Expected MI: 0.07 (reduction: 0.01)
#
# System asks: "Do you have pain behind your eyes?"
# Patient: "Yes"
# New MI: 0.02 (now confident for Dengue)
```

### Clinical Impact
- **Before:** Asks 8-10 questions on average
- **After:** Asks 4-5 targeted questions, same accuracy
- **Outcome:** Faster diagnosis, less patient fatigue

---

## Scenario 5: Multi-Metric Uncertainty for Risk Stratification

### Context
A hospital implements a 3-tier triage system based on prediction reliability.

### Risk Stratification Matrix

| Confidence | Uncertainty (MI) | Ensemble Disagreement | Action |
|------------|------------------|----------------------|--------|
| >90% | <0.03 | <0.10 | **Green**: Automated diagnosis |
| 70-90% | 0.03-0.08 | 0.10-0.25 | **Yellow**: Nurse review |
| <70% | >0.08 | >0.25 | **Red**: Physician review |

### Implementation

```python
def triage_decision(prediction_result):
    confidence = prediction_result["confidence"]
    mi = prediction_result["mutual_information"]
    disagreement = prediction_result["ensemble_disagreement"]
    
    # Green tier: High confidence, low uncertainty
    if (confidence > 0.90 and 
        mi < 0.03 and 
        disagreement < 0.10):
        return {
            "level": "GREEN",
            "action": "Automated diagnosis - no review needed",
            "wait_time": "0 minutes"
        }
    
    # Yellow tier: Moderate confidence or uncertainty
    elif (confidence > 0.70 and 
          mi < 0.08 and 
          disagreement < 0.25):
        return {
            "level": "YELLOW",
            "action": "Nurse review required",
            "wait_time": "15-30 minutes"
        }
    
    # Red tier: Low confidence or high uncertainty
    else:
        return {
            "level": "RED",
            "action": "Physician review required",
            "wait_time": "30-60 minutes"
        }

# Real case:
# Patient with atypical symptoms
# Confidence: 0.75 (looks like Yellow)
# MI: 0.12 (⚠️ High)
# Disagreement: 0.38 (⚠️ High)
# 
# Result: RED triage (correctly flagged despite moderate confidence)
```

### Clinical Impact
- **Before:** All predictions treated equally
- **After:** Risk-stratified workflow optimizes clinician time
- **Outcome:** High-risk cases get attention, low-risk cases processed quickly

---

## Scenario 6: Model Comparison and Selection

### Context
The hospital is choosing between two models for deployment.

### Before Improvements

```python
# Only accuracy comparison
Model A: 87% accuracy
Model B: 85% accuracy
# Decision: Choose Model A (higher accuracy)
```

**Issue:** Ignores reliability of predictions

### After Improvements

```python
# Comprehensive uncertainty-aware comparison
metrics = {
    "Model A": {
        "accuracy": 0.87,
        "ece": 0.15,  # Poor calibration
        "mi_separation_auc": 0.62,  # Can't distinguish good/bad predictions
        "mean_uncertainty_correct": 0.02,
        "mean_uncertainty_incorrect": 0.05,
    },
    "Model B": {
        "accuracy": 0.85,
        "ece": 0.04,  # Excellent calibration
        "mi_separation_auc": 0.81,  # Excellent separation
        "mean_uncertainty_correct": 0.01,
        "mean_uncertainty_incorrect": 0.12,  # High uncertainty for wrong predictions!
    }
}

# Decision: Choose Model B despite lower accuracy
# Reason: Better calibrated, uncertainty reliably flags errors
```

### Clinical Impact
- **Before:** Deployed model with hidden reliability issues
- **After:** Chose model that better signals when it might be wrong
- **Outcome:** Clinicians can trust uncertainty flags for safety net

---

## Scenario 7: Continuous Quality Monitoring

### Context
A deployed model needs ongoing monitoring for performance degradation.

### Dashboard Metrics

```python
# Daily monitoring report
daily_metrics = {
    "date": "2026-03-14",
    "total_predictions": 1247,
    
    # Quality metrics
    "accuracy_estimate": 0.84,
    "ece": 0.05,
    "mean_confidence": 0.82,
    "mean_mi": 0.04,
    
    # Alert thresholds
    "high_uncertainty_cases": 89,  # 7.1% (threshold: 5%)
    "clinician_overrides": 34,     # 2.7% (threshold: 5%)
    
    # Trend analysis
    "mi_trend_7d": "+0.015",  # ⚠️ Increasing uncertainty
    "accuracy_trend_7d": "-0.03",  # ⚠️ Decreasing accuracy
}

# Alert triggered: Uncertainty increasing over 7 days
# Investigation: New symptom patterns not in training data
# Action: Schedule model retraining with recent cases
```

### Clinical Impact
- **Before:** Model degradation detected months later
- **After:** Weekly trends trigger proactive maintenance
- **Outcome:** Maintained performance through timely updates

---

## Key Takeaways

| Improvement | Clinical Benefit |
|-------------|------------------|
| **Multi-metric uncertainty** | Catches unreliable predictions that confidence alone misses |
| **Calibration (ECE)** | Ensures "90% confidence" actually means 90% accuracy |
| **Temperature scaling** | Reduces overconfidence, improves trust |
| **Threshold optimization** | Data-driven thresholds instead of arbitrary values |
| **Ensemble disagreement** | Detects when model internally disagrees |
| **Uncertainty separation** | Validates that uncertainty correlates with errors |

### Real-World Impact Summary

1. **Patient Safety:** High-uncertainty cases routed to clinicians
2. **Resource Optimization:** Low-uncertainty cases processed automatically
3. **Trust:** Calibrated predictions enable reliable decision-making
4. **Early Warning:** Uncertainty spikes detect outbreaks and novel diseases
5. **Quality Assurance:** Continuous monitoring prevents silent degradation

---

## Appendix: Configuration for Production

```bash
# .env configuration for production deployment

# Uncertainty thresholds (optimized from validation data)
VALID_MAX_UNCERTAINTY=0.05
VALID_MAX_VARIANCE=0.02
VALID_MAX_CV=0.15
VALID_MAX_DISAGREEMENT=0.20

# Enable composite uncertainty (flag if ANY metric exceeds threshold)
USE_COMPOSITE_UNCERTAINTY=true

# Calibration settings
TARGET_ECE=0.05
USE_TEMPERATURE_SCALING=true
TEMPERATURE=1.8  # Determined from validation set

# Triage thresholds
TRIAGE_HIGH_CONFIDENCE=0.90
TRIAGE_LOW_UNCERTAINTY=0.03
```
