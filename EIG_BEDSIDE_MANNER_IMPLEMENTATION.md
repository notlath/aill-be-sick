# Expected Information Gain (EIG) "Doctor's Bedside Manner" Implementation

**Document Type:** Explanation  
**Target Audience:** Thesis Defense Committee, Project Maintainers  
**Purpose:** To explain the architectural and implementation changes introduced in the `improve/diagnosis-questions` branch, which enhance the naturalness and efficiency of the AI symptom checker.

---

## 1. Introduction & Theoretical Motivation

Prior to these changes, the Expected Information Gain (EIG) question selection mathematically maximized information gain, which often resulted in the system rapidly jumping between completely unrelated diseases. While optimal for minimizing entropy, this produced a jarring, unnatural user experience—violating a traditional "Doctor's Bedside Manner".

To address this, we have introduced a comprehensive, multi-faceted Active Learning subsystem. The updated system dynamically adapts its questioning strategy based on current model confidence, the cognitive burden of questions, semantic novelty, and mathematical diminishing returns.

## 2. Configurable Core Thresholds (`backend/app/config.py`)

We centralized all tuning parameters for the EIG subsystem into the environment configuration to allow easy adjustments during clinical validation:

*   **Early Stopping:** `MIN_EIG_THRESHOLD` (0.015) and `EIG_DECAY_FACTOR` (0.3).
*   **User Burden:** `BURDEN_PENALTY_FACTOR` (0.08).
*   **Differential Focus:** `TOP_K_DISEASES` (3) and `DIFFERENTIAL_EIG_WEIGHT` (0.7).
*   **Mode Switching:** `MODE_EXPLORATION_MAX_CONF` (0.50), `MODE_CONFIRMATION_MIN_CONF` (0.65), `MODE_RULE_OUT_SECOND_MIN` (0.20).
*   **Semantic Diversity:** `NOVELTY_PENALTY_WEIGHT` (0.12).

## 3. The 6-Pillar Enhancements (`backend/app/services/information_gain.py`)

The core active learning logic was entirely refactored to support six distinct algorithmic improvements:

### A. Confidence-Aware Mode Switching
The system evaluates the current disease probabilities to determine a `DiagnosisMode`:
1.  **EXPLORATION:** (Confidence < 50%) Focuses on broad information gathering. Relies primarily on raw EIG.
2.  **RULE_OUT:** (Confidence >= 50%, but 2nd place >= 20%) Focuses heavily on differentiating the top contenders.
3.  **CONFIRMATION:** (Confidence >= 65%) Focuses heavily on the top-predicted disease to build sufficient evidence for a final diagnosis.

### B. Top-K Differential EIG
Standard EIG measures overall entropy reduction across *all* possible classes. We implemented `compute_differential_eig`, which computes entropy reduction strictly across the `TOP_K_DISEASES`. This prevents the system from asking questions to distinguish between diseases that are already highly unlikely.

### C. Burden Penalties
Not all questions are equally easy for a patient to answer. 
*   **Data Enrichment:** We added a `burden` score (1-5) to all 60 English and Tagalog questions in `question_bank.json` and `question_bank_tagalog.json`. (1 = simple yes/no; 5 = requires specific knowledge or difficult observation).
*   **Algorithm:** `compute_burden_penalty` scales the 1-5 score into a normalized penalty subtracted from the baseline EIG, gently pushing the AI towards easier questions when multiple questions offer similar mathematical value.

### D. Novelty Penalties (`backend/app/question_groups.py`)
To prevent the AI from repeatedly asking about variations of the same symptom (e.g., asking about nausea, then immediately asking about vomiting), we implemented `compute_question_similarity` and `get_novelty_penalty`.
*   Uses Jaccard similarity across semantic symptom groups to softly penalize candidate questions that are too similar to questions already asked in the active session.

### E. Early Stopping Rule
The AI now recognizes diminishing returns. The `should_stop_early` function triggers a halt if:
1.  The best available question's EIG drops below `MIN_EIG_THRESHOLD`.
2.  The best EIG drops below a decay threshold relative to the *first* question asked in the session (tracked via `initial_eig`).

### F. Mode-Adjusted Scoring
The final selection algorithm (`compute_mode_adjusted_score`) blends all of the above dynamically. For example, during `CONFIRMATION` mode, it applies a 50% multiplier to questions targeting the top disease, while applying burden and novelty subtractions.

## 4. Backend API Integration (`backend/app/api/diagnosis.py`)

The `/diagnosis/follow-up` endpoint was updated to support the new active learning system and UI features:

*   **Initial EIG Tracking:** Captures the `initial_eig` on the first question and stores it in the database-backed session state.
*   **New Return Signature:** `select_best_question_across_diseases` now returns a tuple `(selected_question, should_stop_eig, best_eig)`.
*   **Automated EIG Stopping:** If `should_stop_eig` is true, the API short-circuits and immediately returns a final diagnosis with a specific `EIG_DIMINISHING_RETURNS` or `EIG_LOW_CONFIDENCE` status.
*   **Manual "Skip to Results" (Force Complete):** Reads a new `force_complete` boolean from the request body. If true, it immediately cuts the diagnosis short and delivers the current predictions with a `USER_SKIPPED` status.

## 5. Frontend UI/UX Updates

To give patients ultimate control over the length of their diagnostic assessment, we implemented a "Skip to Results" feature.

*   **Server Actions (`frontend/actions/get-follow-up-question.ts`):** 
    Added `force_complete` to the Zod validation schema and the outgoing Axios payload.
*   **Chat Window Controller (`frontend/components/patient/diagnosis-page/chat-window.tsx`):**
    Created `handleSkipToResults`, an asynchronous handler that sends a user message ("I'd like to see the results now.") and dispatches a follow-up request with `force_complete: true`.
*   **Chat Components (`frontend/components/patient/diagnosis-page/...`):**
    Passed the skip callback down through `chat-container.tsx` into `question-bubble.tsx`. Rendered a new `Skip to Results` ghost button beneath the primary "Yes"/"No" options.

## Summary

These changes collectively transform the symptom checker from a naive mathematical optimizer into an adaptive, context-aware conversational agent that respects user time, cognitive load, and logical medical workflows.