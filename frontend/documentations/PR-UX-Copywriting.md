# Title: UX/Copywriting Refactor: Improved Diagnosis Feedback & Actionable Guidance

# What does this PR do?

This PR redesigns the user-facing diagnosis text and frontend interface to adhere strictly to the project's medical copywriting guidelines and UX best practices. It transitions the system from displaying overly technical, abrupt diagnostic failures to providing supportive, plain-language guidance that focuses on actionable next steps without overwhelming the user.

**Backend Changes (`backend/app/api/diagnosis.py`):**
- **Refactored `EIG_LOW_CONFIDENCE` Messaging:** Replaced the highly technical "Assessment incomplete but further questions unlikely to help" with a clear, supportive response: *"Based on the information provided, we could not identify a specific condition with enough certainty. Please consult a healthcare provider for a proper evaluation."*
- **Standardized Valid Diagnostics:** Updated `EIG_DIMINISHING_RETURNS` and `HIGH_CONFIDENCE_FINAL` successful diagnoses to consistently use Markdown for emphasis: *"Based on your reported symptoms, **{pred}** is the closest match."*
- **Softened Tone on Out-of-Scope Diagnostics:** 
  - Adjusted `_build_conflicting_match_message()` to use natural phrasing ("what you described" instead of "reported signs") and removed alarming phrasing like "as soon as possible".
  - Softened the `USER_SKIPPED_LOW_CONFIDENCE` message from the accusatory *"We didn't gather..."* to a collaborative *"We weren't able to gather..."*
  - Rephrased the red flag early stopping message to: *"Some symptoms you described are not typical of..."*

**Frontend Changes (`frontend/components/patient/diagnosis-page/chat-bubble.tsx` & `chat-window.tsx`):**
- **Actionable Low-Confidence Guidance:** Added a contextual tip exclusively for low-confidence results (`confidence < 0.7`). It displays a supportive message: *"Consider noting your symptoms and when they started before visiting a healthcare provider."*
- **Maintained Role-Based Complexity:** Ensured that raw confidence metrics, uncertainty scores, and underlying model names remain strictly hidden behind the "Show details (for clinicians)" toggle, preventing information overload for standard `PATIENT` accounts.
- **DaisyUI Compliance:** Implemented the new guidance block using native DaisyUI utility classes (`bg-info/10`, `rounded-md`, `text-xs`, `text-base-content/70`) without relying on custom Tailwind styles.
- **Frontend/Backend Synchronization:** Updated the hardcoded `CONFLICTING_MATCH` fallback text in `chat-window.tsx` to match the newly softened backend copy.

# Testing Done:

- **Syntax & Compilation:**
  - Ran `python -m py_compile backend/app/api/diagnosis.py` to confirm Python syntax correctness.
  - Executed `npx tsc --noEmit` in the `frontend` directory to ensure no newly introduced TypeScript errors in the `ChatBubble` or `chat-window` components.
- **Role Validation (Simulated):**
  - Verified logic bounds ensuring that raw technical details (confidence %, uncertainty %, model name) remain hidden by default.
  - Verified that the `tempDiagnosis.confidence < 0.7` check correctly gates the newly added actionable guidance block.
- **Message Consistency:**
  - Checked alignment between backend responses and the frontend UI logic to guarantee that fallback scenarios correctly pipe the updated user-friendly phrasing.

# Additional Notes: 

- **Medical Informatics Standards Compliance:** This refactor adheres to the AHRQ CDSiC Patient-Centered CDS guidelines by translating numeric uncertainty metrics into plain-language confidence tiers and actionable wording. It respects the standard of never making absolute medical claims.
- **Target Audience Alignment:** Revisions directly support the project goal of accommodating adult millennials through older, non-technical users by excising jargon (like "EIG" or "assessment incomplete").