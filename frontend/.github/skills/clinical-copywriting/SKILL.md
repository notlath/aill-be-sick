---
name: clinical-copywriting
description: Rewrite and generate user-facing medical text for AI’ll Be Sick using calm, plain-language bedside manner. Use for diagnosis messages, warnings, tooltips, labels, modal copy, and clinician/patient guidance text.
---

# Clinical Copywriting

## Voice and audience

- Audience: adult millennials through older non-technical users.
- Tone: calm, respectful, supportive, practical.
- Style: short sentences, familiar words, actionable next steps.

## Readability Targets (Fool-Proof + Clinical Rigor)

| Copy Type            | Reading Level | Target Flesch | Word Limit |
| -------------------- | ------------- | ------------- | ---------- |
| **Patient results**  | Grade 6–8     | 60–70         | <60 words  |
| **Urgent warnings**  | Grade ≤6      | 75+           | <30 words  |
| **Clinician panels** | Grade 10–12   | 30–50         | <100 words |

**Before shipping:** Ask "Can a 6th grader understand this and take the right action?"

## Required constraints

- Avoid absolute claims (forbidden examples: “you definitely have…”, “confirmed diagnosis”).
- Prefer probabilistic/supportive phrasing (examples: “might indicate…”, “suggests…”, “consider consulting…”).
- Explain medical jargon in simple language.
- Never use the word "cluster" in user-facing text; use "group".

## Rewrite checklist

1. Is the message understandable by non-technical users?
2. Does it avoid guaranteed medical outcomes?
3. Does it provide a clear next step?
4. Is the tone calm and non-alarmist?
5. Does it avoid disallowed wording?

## Typical use cases

- Confidence/uncertainty explanation messages
- Follow-up question prompts
- Alerts and warnings
- Help modal content
- Dashboard explanatory copy

## Output format suggestion

- Revised copy
- 1-2 sentence rationale focusing on clarity, reading level, and clinical safety
- Confidence/uncertainty statement (if diagnostic content)

## Dual-Layer Approach

**Layer 1 (Fool-Proof UX):** Plain language, short sentences, one action per message. Avoid jargon stacking.

**Layer 2 (Clinical Rigor):** Show confidence scores, uncertainty, and when to seek care. Never use absolute language.

Both layers must coexist. Example:

- Simple: "You might have the flu. See a doctor if symptoms last >5 days."
- - Clinical: "Your symptoms suggest influenza, which affects ~60% of users with these symptoms. Most recover without treatment. Seek immediate care if you have difficulty breathing."
