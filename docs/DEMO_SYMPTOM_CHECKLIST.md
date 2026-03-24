# Demo Symptom Checklist

This document provides a quick reference for which symptoms to select in the **SymptomChecklist UI** to trigger each specific disease diagnosis during demos and testing.

---

## Quick Reference Table

| Disease | Key Symptoms to Check | Avoid Checking |
|---------|----------------------|----------------|
| **Dengue** | pain_behind_eyes, rash_red_spots, bleeding_gums_nose | dry_cough, runny_stuffy_nose |
| **Pneumonia** | wet_cough, chest_pain_breathing, shortness_of_breath | runny_stuffy_nose |
| **Typhoid** | gradual_onset, rose_spots_torso, constipation | dry_cough, wet_cough |
| **Diarrhea** | diarrhea_watery, dehydration, stomach_cramps | high_fever (use mild_fever) |
| **Measles** | rash_spreading_face, white_spots_mouth, red_watery_eyes | bleeding_gums_nose, pain_behind_eyes |
| **Influenza** | sudden_onset, dry_cough, runny_stuffy_nose | pain_behind_eyes, wet_cough |

---

## Dengue

Classic "break-bone fever" with retro-orbital pain and no respiratory symptoms.

### Symptoms to Check

- [ ] **High fever** (General)
- [ ] **Body or muscle aches** (General)
- [ ] **Pain behind the eyes** (Head) - KEY DIFFERENTIATOR
- [ ] **Severe or pounding headache** (Head)
- [ ] **Fatigue or weakness** (General)
- [ ] **Nausea or vomiting** (Digestive)
- [ ] **Rash of tiny red spots on skin** (Skin & Eyes)
- [ ] **Bleeding gums or nosebleed** (Skin & Eyes)

### DO NOT Check (Differentiators)

- [ ] ~~Dry or hacking cough~~ (Respiratory)
- [ ] ~~Runny or stuffy nose~~ (Respiratory)

---

## Pneumonia

Productive cough with chest involvement and difficulty breathing.

### Symptoms to Check

- [ ] **Cough with thick or colored phlegm** (Respiratory) - KEY SYMPTOM
- [ ] **Chest pain when breathing or coughing** (Respiratory) - KEY SYMPTOM
- [ ] **Shortness of breath or difficulty breathing** (Respiratory)
- [ ] **High fever** (General)
- [ ] **Chills or shivering** (General)
- [ ] **Fatigue or weakness** (General)
- [ ] **Body or muscle aches** (General)
- [ ] **Nausea or vomiting** (Digestive)

### DO NOT Check (Differentiators)

- [ ] ~~Runny or stuffy nose~~ (Respiratory)

---

## Typhoid

Gradual onset with prolonged fever and GI symptoms, no respiratory involvement.

### Symptoms to Check

- [ ] **High fever** (General)
- [ ] **Symptoms built up over several days** (General) - KEY DIFFERENTIATOR
- [ ] **Stomach cramps or abdominal pain** (Digestive)
- [ ] **Constipation** (Digestive) - OR diarrhea, either works
- [ ] **Faint pink or rose spots on chest or stomach** (Skin & Eyes)
- [ ] **Severe or pounding headache** (Head)
- [ ] **Loss of appetite** (General)
- [ ] **Fatigue or weakness** (General)
- [ ] **Confusion or brain fog** (Head) - for severe cases

### DO NOT Check (Differentiators)

- [ ] ~~Dry or hacking cough~~ (Respiratory)
- [ ] ~~Cough with thick or colored phlegm~~ (Respiratory)
- [ ] ~~Shortness of breath~~ (Respiratory)

---

## Diarrhea (Acute Gastroenteritis)

Sudden GI symptoms with dehydration, typically mild fever only.

### Symptoms to Check

- [ ] **Diarrhea (frequent watery stools)** (Digestive) - KEY SYMPTOM
- [ ] **Stomach cramps or abdominal pain** (Digestive)
- [ ] **Signs of dehydration (thirst, dry mouth, low urine)** (Digestive)
- [ ] **Nausea or vomiting** (Digestive)
- [ ] **Fatigue or weakness** (General)
- [ ] **Mild or low-grade fever** (General) - NOT high fever
- [ ] **Blood in stool** (Digestive) - for bacterial cases

### DO NOT Check (Differentiators)

- [ ] ~~High fever~~ (use mild fever instead)
- [ ] ~~Dry or hacking cough~~ (Respiratory)
- [ ] ~~Runny or stuffy nose~~ (Respiratory)

---

## Measles

Spreading rash with the "3 Cs" - Cough, Coryza (runny nose), Conjunctivitis.

### Symptoms to Check

- [ ] **Rash spreading from face or head downward** (Skin & Eyes) - KEY SYMPTOM
- [ ] **High fever** (General)
- [ ] **Dry or hacking cough** (Respiratory)
- [ ] **Red, watery, or light-sensitive eyes** (Skin & Eyes)
- [ ] **Runny or stuffy nose** (Respiratory)
- [ ] **Tiny white spots inside the mouth** (Skin & Eyes) - Koplik spots, PATHOGNOMONIC
- [ ] **Sore or scratchy throat** (Respiratory)
- [ ] **Fatigue or weakness** (General)

### DO NOT Check (Differentiators)

- [ ] ~~Bleeding gums or nosebleed~~ (Skin & Eyes)
- [ ] ~~Pain behind the eyes~~ (Head) - this points to Dengue

---

## Influenza

Sudden onset with respiratory symptoms, no rash or retro-orbital pain.

### Symptoms to Check

- [ ] **Symptoms started suddenly** (General) - KEY DIFFERENTIATOR
- [ ] **High fever** (General)
- [ ] **Dry or hacking cough** (Respiratory)
- [ ] **Body or muscle aches** (General)
- [ ] **Fatigue or weakness** (General)
- [ ] **Severe or pounding headache** (Head)
- [ ] **Sore or scratchy throat** (Respiratory)
- [ ] **Runny or stuffy nose** (Respiratory)
- [ ] **Chills or shivering** (General)

### DO NOT Check (Differentiators)

- [ ] ~~Pain behind the eyes~~ (Head) - this points to Dengue
- [ ] ~~Rash of tiny red spots on skin~~ (Skin & Eyes) - this points to Dengue
- [ ] ~~Cough with thick or colored phlegm~~ (Respiratory) - this points to Pneumonia
- [ ] ~~Chest pain when breathing or coughing~~ (Respiratory) - this points to Pneumonia

---

## Test Scenarios

### Minimal Symptom Sets (2-3 symptoms)

Use these for quick testing with minimum required symptoms:

| Disease | Minimal Set |
|---------|-------------|
| Dengue | high_fever + pain_behind_eyes + body_aches |
| Pneumonia | wet_cough + chest_pain_breathing + high_fever |
| Typhoid | high_fever + gradual_onset + stomach_cramps |
| Diarrhea | diarrhea_watery + stomach_cramps + dehydration |
| Measles | rash_spreading_face + high_fever + dry_cough |
| Influenza | sudden_onset + high_fever + dry_cough |

### Full Symptom Sets (Maximum confidence)

Use these for testing with comprehensive symptom coverage - check all items in each disease's "Symptoms to Check" section above.

---

## Notes

1. **Differentiators matter**: The "DO NOT Check" symptoms are actively used by the system to distinguish between diseases. Checking them may reduce confidence or shift the diagnosis.

2. **Follow-up questions**: After initial diagnosis, the system may ask follow-up questions to confirm or refine the prediction. The prerequisite logic ensures questions like "Is your cough dry?" won't be asked unless you've confirmed having a cough.

3. **Minimum symptoms**: The UI requires at least 2 symptoms to be checked before submission.

4. **Language**: The checklist works the same for both English and Tagalog - the underlying symptom IDs are language-agnostic.
