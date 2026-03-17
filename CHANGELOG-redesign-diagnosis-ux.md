# Changelog: `redesign/diagnosis-ux`

Branch base: `main` @ `eb6b60f`

## Summary

Redesigns the patient-facing diagnosis UX (ChatBubble and CDSSSummary components) to comply with medical informatics standards (FDA CDS Guidance, Five Rights of CDS, AHRQ CDSiC, HL7 CDS Hooks) and the project's copywriting guidelines. Also fixes the backend so CDSS knowledge references are disease-specific rather than hardcoded placeholders, and provides a migration script to back-fill existing database records.

---

## Files Changed

| File | Type | Lines |
|------|------|-------|
| `frontend/components/patient/diagnosis-page/chat-bubble.tsx` | Modified | +221 / −80 |
| `frontend/components/patient/diagnosis-page/cdss-summary.tsx` | Modified | +159 / −55 |
| `frontend/components/patient/diagnosis-page/chat-window.tsx` | Modified | +12 / −11 |
| `backend/app/utils/__init__.py` | Modified | +178 / −34 |
| `frontend/scripts/migrate-cdss-knowledge.js` | **New** | 166 lines |

**Total: 4 files modified, 1 file created — 437 insertions, 144 deletions (excluding migration script)**

---

## Detailed Changes

### 1. ChatBubble Redesign (`chat-bubble.tsx`)

**What changed:**

- **Diagnosis card layout** — DIAGNOSIS-type messages now render as a distinct card (`border border-base-300 bg-base-100 shadow-sm`) instead of using the same chat-bubble styling as regular AI messages.
- **Activity icon** — New inline SVG icon (EKG pulse line) with a "Suggested condition" header strip to visually separate diagnosis output from conversational text.
- **Confidence tier system** — Added `getConfidenceTier()` helper that maps raw confidence scores to plain-language labels:
  - `>= 0.95` → "Strong match" (`badge-success`)
  - `>= 0.70` → "Possible match" (`badge-warning`)
  - `< 0.70` → "Weak match" (`badge-error`)
- **Always-visible disclaimer** — Every diagnosis bubble shows: *"This is a suggestion, not a diagnosis."*
- **Expanded clinician details** — The collapsible details section is now available at ALL confidence levels (previously gated), showing a structured `<dl>` grid with Condition, Confidence %, Uncertainty %, and formatted Model name.
- **`formatModelName()` helper** — Converts internal model identifiers to human-readable display names.
- **Non-DIAGNOSIS bubble types** (ERROR, INFO, USER) are unchanged.

**Why:**

- FDA CDS Guidance requires clear distinction between AI-generated clinical suggestions and informational text.
- Five Rights of CDS: the right *format* — diagnosis output must be visually distinct and immediately identifiable.
- AHRQ CDSiC Patient-Centered CDS: confidence should be communicated in plain language, not raw percentages alone.
- Copywriting guidelines: no absolutes, calm/supportive tone, action-oriented.

---

### 2. CDSSSummary Redesign (`cdss-summary.tsx`)

**What changed — all 9 audit findings addressed:**

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | Critical | No disclaimer/liability statement | Added `<footer>` disclaimer: *"This summary supports clinical decision-making. It does not replace professional medical judgment."* |
| 2 | Critical | Triage level had no severity-based styling | Added `getTriageBadgeClass()`: URGENT/HIGH → `badge-error`, MODERATE/MEDIUM → `badge-warning`, LOW → `badge-info` |
| 3 | Critical | `recommendation.rationale` typed but never rendered | Now renders bulleted list under "Rationale:" heading when present |
| 4 | High | "CDSS Summary" title was jargon | Changed to "Clinical support summary" |
| 5 | High | Knowledge links labeled just "link" (WCAG 2.4.4) | Links now read `View {source name}` or "View source" |
| 6 | High | No `aria-live`/`role="alert"` on red flags | Red flags container has `role="alert"` and `aria-live="assertive"` |
| 7 | Medium | No timestamp on clinical output | Accepts optional `generatedAt` prop; falls back to memoized render time; displayed as `<time>` element |
| 8 | Medium | Differential `code` field defined but never displayed | Differential table conditionally shows "Code" column (monospace, muted) when any entry has a code value |
| 9 | Medium | "Other possibilities" label was vague | Changed to "Other conditions considered" |

**Additional:**

- Component converted from `function` declaration to arrow function per project conventions.
- TypeScript type-check: zero errors.

**Why:**

- Full compliance audit was performed against FDA CDS Software Guidance (Jan 2026), Five Rights of CDS, AHRQ CDSiC, HL7 CDS Hooks card patterns, and ONC SAFER Guides.

---

### 3. Chat Window Message Text (`chat-window.tsx`)

**What changed:**

- **High-confidence message**: `"Final assessment: ${disease} (confidence ${(confidence * 100).toFixed(1)}%)"` → `"Based on the reported symptoms, **${disease}** is the closest match."`
- **Fallback message**: `"Assessment complete: ${disease}"` → `"Based on the reported symptoms, **${disease}** may be a possible match. A healthcare provider should evaluate these findings."`
- **Variable rename**: `impressive` → `isHighConfidence` for clarity.

**Why:**

- Copywriting guidelines prohibit absolute claims ("Final assessment" implies certainty).
- "Assessment complete" gave no actionable guidance to the patient.
- Variable name `impressive` was subjective/unclear.

---

### 4. Backend Disease-Specific Knowledge (`backend/app/utils/__init__.py`)

**What changed:**

- Replaced the hardcoded 2-entry placeholder knowledge list (Dengue WHO + Pneumonia CDC returned for ALL diseases) with a `_KNOWLEDGE_BY_DISEASE` mapping inside `_build_cdss_payload()`.
- Each of the 6 model diseases (Dengue, Diarrhea, Influenza, Measles, Pneumonia, Typhoid) now gets 2 entries: one WHO fact sheet + one CDC page.
- Generic fallback for unknown diseases (WHO health topics page).
- All 12 disease-specific URLs verified as live.
- The mapping dict is intentionally kept inside `_build_cdss_payload()` (locality over module-level hoisting, per user preference).

**Why:**

- Patients were seeing irrelevant knowledge references (e.g., Dengue WHO link when diagnosed with Measles).
- Five Rights of CDS: the right *information* must be delivered — disease-specific references are essential.

---

### 5. Database Migration Script (`frontend/scripts/migrate-cdss-knowledge.js`)

**New file.** Updates the `cdss.knowledge` JSON blob in both `TempDiagnosis` and `Diagnosis` tables to use disease-specific references instead of the old hardcoded placeholders.

- Matches knowledge entries to each record's `disease` column.
- Includes Impetigo mapping (generic WHO fallback).
- Idempotent — safe to re-run.
- Follows project script conventions: plain `.js`, uses `require("../lib/generated/prisma")`, `process.exitCode = 1` on error, `prisma.$disconnect()` in `finally`.
- Successfully ran: 1 Diagnosis record updated, 0 TempDiagnosis records had CDSS data.

---

## Standards Referenced

| Standard | Publisher | Relevance |
|----------|-----------|-----------|
| Clinical Decision Support Software — Guidance for Industry | FDA (Jan 2026) | Disclaimer requirements, distinction between AI suggestion and diagnosis |
| Five Rights of CDS | AMIA / Clinical Informatics | Right information, right format, right person, right channel, right time |
| Patient-Centered CDS | AHRQ CDSiC | Plain-language confidence, actionable wording |
| CDS Hooks | HL7 | Card-based clinical output patterns, `indicator` severity mapping |
| SAFER Guides | ONC | Clinical output temporal context (timestamps) |
| WCAG 2.4.4 | W3C | Accessible link text (knowledge links) |

---

## How to Test

1. **Frontend type-check**: `cd frontend && npx tsc --noEmit`
2. **Backend**: `cd backend && python -m pytest` (or start with `python app.py` and test a diagnosis flow)
3. **Migration script** (if needed for existing records): `cd frontend && node scripts/migrate-cdss-knowledge.js`
4. **Visual QA**: Navigate to a diagnosis chat page, trigger a diagnosis, and verify:
   - Diagnosis bubble uses the card layout with confidence tier badge
   - Disclaimer text is visible
   - Clinician details expand for all confidence levels
   - CDSSSummary shows the updated title, triage badge colors, timestamp, and knowledge links with descriptive text
   - Red flags are announced by screen readers (`role="alert"`)
