# Follow-Up Questionnaire Medical Verification Report

This report verifies the accuracy and authenticity of the follow-up questionnaire questions against current medical literature and diagnostic criteria from WHO, CDC, and other authoritative sources.

**Research conducted**: March 2026  
**Sources**: WHO guidelines, CDC clinical criteria, peer-reviewed medical literature via Tavily research API

---

## Summary

| Disease | Questions Verified | Accuracy | Issues Found |
|---------|-------------------|----------|--------------|
| Dengue | 10/10 | Excellent | Minor: Could add tourniquet test |
| Pneumonia | 10/10 | Excellent | None |
| Typhoid | 10/10 | Good | Note: Rose spots rare (≤25%), bradycardia in ~15-20% |
| Diarrhea | 10/10 | Excellent | None |
| Measles | 10/10 | Excellent | None |
| Influenza | 10/10 | Excellent | None |

---

## Dengue Fever

### Medical Literature Summary
- **Fever**: Sudden high fever lasting 2-7 days, may be biphasic
- **Retro-orbital pain**: Severe eye pain behind the eyes - classic "break-bone" feature
- **Rash**: Maculopapular, often beginning day 3, lasting 2-3 days
- **Petechiae**: Small red-purple spots indicating capillary fragility
- **Myalgia/Arthralgia**: "Break-bone" muscle and joint pain, often generalized
- **Headache**: Severe, often with retro-orbital component
- **Warning signs (WHO)**: Abdominal pain, persistent vomiting, mucosal bleeding, lethargy

### Question Verification

| Question ID | Question Content | Medical Accuracy | Notes |
|-------------|-----------------|------------------|-------|
| dengue_q1 | "Extremely high fever, burning up" | VERIFIED | Matches WHO/CDC: sudden high fever 2-7 days |
| dengue_q2 | "Severe muscle and joint pain, whole body aches" | VERIFIED | Classic "break-bone fever" myalgia/arthralgia |
| dengue_q3 | "Deep, intense pain right behind your eyes" | VERIFIED | Retro-orbital pain is pathognomonic for dengue |
| dengue_q4 | "Unusual mild bleeding (gums, nosebleed)" | VERIFIED | Mucosal bleeding is a WHO warning sign |
| dengue_q5 | "Rash of tiny red dots/speckles" | VERIFIED | Petechiae indicate capillary fragility |
| dengue_q6 | "Severe, pounding headache" | VERIFIED | Severe headache often accompanies retro-orbital pain |
| dengue_q7 | "Nauseous or vomited" | VERIFIED | Persistent vomiting is a WHO warning sign |
| dengue_q8 | "Overwhelmingly exhausted" | VERIFIED | Fatigue/malaise is common |
| dengue_q9 | "Joints stiff and sore" | VERIFIED | Arthralgia is part of "break-bone" syndrome |
| dengue_q10 | "Without cough or runny nose" (differentiator) | VERIFIED | Respiratory symptoms are NOT typical of dengue - helps differentiate from flu |

**Assessment**: All dengue questions accurately reflect WHO 2009 dengue classification criteria and CDC guidelines. The differentiator question (q10) is clinically appropriate as dengue typically lacks respiratory symptoms.

---

## Pneumonia

### Medical Literature Summary
- **Fever**: Abrupt onset ≥38°C with chills/rigors
- **Productive cough**: Mucopurulent or "rusty" sputum (yellow, green, rusty)
- **Pleuritic chest pain**: Sharp, worsens with deep inspiration
- **Dyspnea/Tachypnea**: Shortness of breath, respiratory rate ≥30/min in severe cases
- **Additional signs**: Crackles, tachycardia, malaise, nausea/vomiting, altered mental status

### Question Verification

| Question ID | Question Content | Medical Accuracy | Notes |
|-------------|-----------------|------------------|-------|
| pneumonia_q1 | "Coughing up thick phlegm (yellow, green, rusty)" | VERIFIED | Classic productive cough description |
| pneumonia_q2 | "Sharp, stabbing chest pain when breathing/coughing" | VERIFIED | Pleuritic chest pain pathognomonic |
| pneumonia_q3 | "Short of breath, hard to catch breath" | VERIFIED | Dyspnea is key diagnostic criterion |
| pneumonia_q4 | "Persistent fever with shivering/sweating chills" | VERIFIED | Fever with rigors is classic presentation |
| pneumonia_q5 | "Without runny nose or sniffles" (differentiator) | VERIFIED | Helps distinguish from viral URI |
| pneumonia_q6 | "Extremely weak, no energy" | VERIFIED | Malaise/fatigue is common |
| pneumonia_q7 | "General body aches with cough" | VERIFIED | Myalgia accompanies pneumonia |
| pneumonia_q8 | "Nauseous or sick to stomach" | VERIFIED | Nausea/vomiting documented |
| pneumonia_q9 | "Dull or persistent headache" | VERIFIED | Headache can accompany systemic infection |
| pneumonia_q10 | "Breathing worse when lying down" | VERIFIED | Orthopnea indicates fluid accumulation/severe disease |

**Assessment**: All pneumonia questions accurately reflect CDC diagnostic guidelines and clinical presentation literature.

---

## Typhoid Fever

### Medical Literature Summary
- **Rose spots**: 2-4mm blanching maculopapular lesions; present in ≤25% of patients (NOT most)
- **Step-ladder fever**: Daily rise in temperature; seen in only ~12% of contemporary cases
- **Relative bradycardia**: Lower-than-expected heart rate for fever; observed in ~15-20% of patients (low sensitivity but high specificity)
- **GI symptoms**: Constipation early, diarrhea later; abdominal pain/tenderness
- **Neurological**: Confusion, "typhoid state" in severe cases
- **Gradual onset**: Symptoms develop over 1-2 weeks

### Question Verification

| Question ID | Question Content | Medical Accuracy | Notes |
|-------------|-----------------|------------------|-------|
| typhoid_q1 | "Fever lasting many days, getting progressively worse" | VERIFIED | Step-ladder pattern, though only ~12% show classic pattern |
| typhoid_q2 | "Stomach tender and cramping" | VERIFIED | Abdominal tenderness is common |
| typhoid_q3 | "Constipated for days OR loose watery stools" | VERIFIED | Constipation early, diarrhea later - both valid |
| typhoid_q4 | "Faint pink/rose spots on chest/stomach" | VERIFIED with caveat | Rose spots present in ≤25% - absence doesn't exclude typhoid |
| typhoid_q5 | "Pulse unusually slow despite fever" | VERIFIED with caveat | Relative bradycardia in ~15-20% - high specificity but low sensitivity |
| typhoid_q6 | "Constant dull ache in front of head" | VERIFIED | Frontal headache is common |
| typhoid_q7 | "Lost appetite, entirely drained" | VERIFIED | Anorexia and fatigue are typical |
| typhoid_q8 | "Confused, disoriented, foggy mind" | VERIFIED | "Typhoid state" with mental changes in severe cases |
| typhoid_q9 | "Symptoms came slowly over days" | VERIFIED | Gradual onset over 1-2 weeks is characteristic |
| typhoid_q10 | "Without severe cough or breathing problems" (differentiator) | VERIFIED | Respiratory symptoms NOT typical of typhoid |

**Assessment**: Questions are medically accurate. Note that rose spots (q4) and bradycardia (q5) have low sensitivity - their absence doesn't exclude typhoid. The questionnaire appropriately captures these as secondary diagnostic features.

---

## Acute Diarrhea (Gastroenteritis)

### Medical Literature Summary
- **Diarrhea**: Sudden onset ≥3 loose watery stools/day
- **Blood in stool**: Suggests invasive bacterial infection (Shigella, Campylobacter)
- **Abdominal cramps**: Crampy, diffuse or lower-quadrant pain
- **Nausea/Vomiting**: Often precedes diarrhea in viral gastroenteritis
- **Fever**: Low-grade in viral; high-grade suggests bacterial
- **Dehydration signs**: Thirst, dry mouth, decreased urine output, dizziness

### Question Verification

| Question ID | Question Content | Medical Accuracy | Notes |
|-------------|-----------------|------------------|-------|
| diarrhea_q1 | "Suddenly passing watery/loose stools several times" | VERIFIED | Classic acute diarrhea presentation |
| diarrhea_q2 | "Severe twisting stomach cramps" | VERIFIED | Abdominal cramping is prominent |
| diarrhea_q3 | "Dehydration signs (thirst, dry mouth, dizzy, low urine)" | VERIFIED | All classic dehydration indicators |
| diarrhea_q4 | "Blood or red streaks in stool" | VERIFIED | Red flag for invasive bacterial infection |
| diarrhea_q5 | "Without cough, runny nose, breathing issues" (differentiator) | VERIFIED | Respiratory symptoms NOT typical |
| diarrhea_q6 | "DO NOT have prolonged worsening fever for over a week" | VERIFIED | Differentiates from typhoid |
| diarrhea_q7 | "Nauseous, queasy, throwing up" | VERIFIED | Common, especially viral |
| diarrhea_q8 | "Entirely drained, extremely weak from fluid loss" | VERIFIED | Dehydration-related weakness |
| diarrhea_q9 | "Mild fever rather than extremely high" | VERIFIED | Viral = low-grade; bacterial = high-grade |
| diarrhea_q10 | "Sudden uncontrollable urge, severe waves" | VERIFIED | Urgency is characteristic |

**Assessment**: All questions accurately reflect acute gastroenteritis diagnostic criteria and dehydration assessment guidelines.

---

## Measles

### Medical Literature Summary
- **Prodrome**: Fever ≥38.3°C, the "3 Cs" (Cough, Coryza, Conjunctivitis), photophobia
- **Koplik spots**: 1-3mm gray-blue/white papules on buccal mucosa ("grains of salt on red background"); appear 1-2 days BEFORE rash; present in 50-70%
- **Maculopapular rash**: Starts at hairline/face, spreads cephalocaudally over 3-4 days; lasts 4-7 days
- **CDC clinical case definition**: Generalized rash ≥3 days + fever ≥38.3°C + cough OR coryza OR conjunctivitis

### Question Verification

| Question ID | Question Content | Medical Accuracy | Notes |
|-------------|-----------------|------------------|-------|
| measles_q1 | "Red blotchy rash starting face/hairline, spreading down" | VERIFIED | Classic cephalocaudal spread pattern |
| measles_q2 | "High fever with persistent dry hacking cough" | VERIFIED | Matches CDC definition (fever + cough) |
| measles_q3 | "Eyes red, watery, sore, sensitive to light" | VERIFIED | Conjunctivitis with photophobia |
| measles_q4 | "Fever, cough, runny nose started BEFORE rash" | VERIFIED | Prodromal symptoms precede rash by 2-4 days |
| measles_q5 | "Constant runny nose" | VERIFIED | Coryza is one of the "3 Cs" |
| measles_q6 | "Tiny white spots like grains of salt inside cheeks" | VERIFIED | Koplik spots - pathognomonic description |
| measles_q7 | "Without unusual bleeding or severe bone pain" (differentiator) | VERIFIED | Differentiates from dengue |
| measles_q8 | "Completely exhausted, wiped out" | VERIFIED | Fatigue/malaise documented |
| measles_q9 | "Scratchy or sore throat" | VERIFIED | Can accompany respiratory prodrome |
| measles_q10 | "Mild diarrhea or loose stools" | VERIFIED | GI symptoms can occur |

**Assessment**: Excellent alignment with CDC clinical case definition. Koplik spots question (q6) uses accurate "grains of salt" descriptor.

---

## Influenza

### Medical Literature Summary
- **CDC ILI definition**: "Sudden onset with at least one systemic sign (fever/feverishness, malaise, headache, myalgia) AND at least one respiratory sign (cough, sore throat, shortness of breath)"
- **Sudden onset**: Symptoms appear abruptly, often within hours
- **Systemic**: Fever ≥38°C or chills, myalgia/body aches, headache, fatigue
- **Respiratory**: Dry/non-productive cough, sore throat
- **Key differentiators from dengue**: Cough and respiratory symptoms present; NO rash; NO retro-orbital pain

### Question Verification

| Question ID | Question Content | Medical Accuracy | Notes |
|-------------|-----------------|------------------|-------|
| influenza_q1 | "Symptoms hit suddenly rather than building slowly" | VERIFIED | Sudden onset is CDC defining feature |
| influenza_q2 | "Persistent, dry, hacking cough" | VERIFIED | Dry cough is characteristic |
| influenza_q3 | "Sore muscles or body aches all over" | VERIFIED | Myalgia is a systemic sign |
| influenza_q4 | "Completely exhausted, tired, wiped out" | VERIFIED | Fatigue/malaise is typical |
| influenza_q5 | "Pounding or lingering headache" | VERIFIED | Headache is systemic sign |
| influenza_q6 | "Scratchy throat, hurts to swallow" | VERIFIED | Sore throat is respiratory sign |
| influenza_q7 | "Runny nose, stuffy nose, sniffles" | VERIFIED | Respiratory symptoms |
| influenza_q8 | "Without skin rash or deep pain behind eyes" (differentiator) | VERIFIED | Key differentiator from dengue |
| influenza_q9 | "Cough mostly dry, not thick colored phlegm" | VERIFIED | Differentiates from bacterial pneumonia |
| influenza_q10 | "Breathing fine, no sharp chest pain" | VERIFIED | Differentiates from pneumonia |

**Assessment**: Questions precisely match CDC influenza-like illness (ILI) definition. Differentiator questions appropriately distinguish from dengue (q8) and pneumonia (q9, q10).

---

## Differentiator Questions Analysis

The questionnaire uses "differentiator" questions that ask about the **absence** of symptoms to distinguish between similar diseases. These are medically sound:

| Differentiator | Purpose | Medical Rationale |
|----------------|---------|-------------------|
| dengue_q10 | "Without cough/runny nose" | Dengue is NOT respiratory; helps exclude flu |
| pneumonia_q5 | "Without runny nose" | Pneumonia is lower respiratory; URI symptoms less common |
| typhoid_q10 | "Without severe cough/breathing" | Typhoid is GI/systemic; respiratory symptoms atypical |
| diarrhea_q5 | "Without cough/runny nose/breathing" | Gastroenteritis is GI-focused |
| diarrhea_q6 | "DO NOT have prolonged fever" | Differentiates from typhoid |
| measles_q7 | "Without bleeding/severe bone pain" | Differentiates from dengue |
| influenza_q8 | "Without rash/retro-orbital pain" | Key differentiator from dengue |
| influenza_q9 | "Cough dry, not productive" | Differentiates from bacterial pneumonia |
| influenza_q10 | "No chest pain when breathing" | Differentiates from pneumonia |

---

## Recommendations

### Minor Improvements (Optional)
1. **Typhoid rose spots (q4)**: Consider adding note that this symptom is present in only ≤25% of cases
2. **Typhoid bradycardia (q5)**: Note that this is a high-specificity but low-sensitivity sign (~15-20% of cases)
3. **Dengue**: Could consider adding tourniquet test question (though requires equipment)

### Strengths
- Differentiator questions are clinically appropriate and help distinguish overlapping presentations
- Questions use accessible, plain language while maintaining medical accuracy
- Symptom weights appropriately reflect diagnostic importance
- Coverage of WHO warning signs for dengue is good

---

## Conclusion

The follow-up questionnaire is **medically accurate and well-aligned** with current WHO and CDC diagnostic criteria. All 60 questions across 6 diseases have been verified against authoritative medical sources. The differentiator questions are particularly well-designed to help distinguish between diseases with overlapping symptoms (e.g., dengue vs. influenza, pneumonia vs. influenza).

---

## Sources

Research conducted using Tavily API with sources including:
- WHO Dengue Classification (2009)
- CDC Clinical Diagnostic Criteria
- Peer-reviewed medical literature on disease presentation
- Current clinical practice guidelines (2024-2026)
