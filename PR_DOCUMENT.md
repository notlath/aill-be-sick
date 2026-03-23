# Title: Feat: Redesign UI components and add AI insights explanation

# What does this PR do?

This PR introduces several significant UI and UX improvements, overhauling the Clinician Alert Card and Patient CDSS Summary components, and adds a new AI Insights feature to explain the model's reasoning to patients.

Specifically, it:
- **Redesigns the Clinician Alert Card (`alert-card.tsx`)**: Upgrades the visual hierarchy with a cleaner design using standardized semantic colors. Adds an improved action sidebar/bottom-bar for acknowledging, dismissing, and viewing alerts.
- **Overhauls the CDSS Summary (`cdss-summary.tsx`)**: Transforms the clinical support summary into a more polished, user-friendly "Clinical Hero" card. It includes a clear urgency triage section, highlighted red flags, numbered next steps with logical reasoning, and a collapsible section for other considered conditions and technical model details.
- **Adds AI Insights Explanation (`insights-modal.tsx`)**: Introduces a new feature allowing patients to see a plain-English explanation of why the AI made a certain diagnosis suggestion. It integrates a server action (`generate-insights-explanation.ts`) to translate complex SHAP token importances into readable text and a word importance heatmap.
- **Updates Chat Bubbles (`chat-bubble.tsx`, `chat-container.tsx`, `question-bubble.tsx`)**: Adjusts styling for better contrast and passes the patient's original symptoms to the Insights Modal for context.
- **Typography Enhancements (`globals.css`, `layout.tsx`, `choropleth-legend.tsx`)**: Adds a `Geist Fallback` font to ensure consistent rendering across different environments.
- **Fixes minor typos**: Updates care setting "ER" to "Emergency Room" in the backend payload builder.

# Files Changed

**Backend:**
- `backend/app/utils/__init__.py`

**Frontend Styles & Layout:**
- `frontend/app/globals.css`
- `frontend/app/layout.tsx`

**Clinician Components:**
- `frontend/components/clinicians/alerts/alert-card.tsx`
- `frontend/components/clinicians/map-page/map/choropleth-legend.tsx`
- `frontend/components/clinicians/map-page/map/cluster-choropleth-legend.tsx`

**Patient Components:**
- `frontend/components/patient/diagnosis-page/cdss-summary.tsx`
- `frontend/components/patient/diagnosis-page/chat-bubble.tsx`
- `frontend/components/patient/diagnosis-page/chat-container.tsx`
- `frontend/components/patient/diagnosis-page/insights-modal.tsx`
- `frontend/components/patient/diagnosis-page/question-bubble.tsx`

**New Actions & Utils:**
- `frontend/actions/generate-insights-explanation.ts` [NEW]
- `frontend/schemas/GenerateInsightsExplanationSchema.ts` [NEW]
- `frontend/utils/shap-tokens.ts` [NEW]

# Testing Done

- Evaluated the UI changes in `alert-card.tsx` and `cdss-summary.tsx` to ensure proper rendering of the new design system.
- Confirmed the integration of the `generate-insights-explanation` action within the `insights-modal`.
- Verified the fallback font settings in the global CSS and layout.

# Additional Notes

- The UI changes strictly adhere to the DaisyUI-only guidelines while introducing independent semantic colors for alerts to improve contrast and accessibility.
