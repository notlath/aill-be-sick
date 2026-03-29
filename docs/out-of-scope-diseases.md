# Out-of-Scope Disease Mimickers

This document catalogs diseases that share overlapping symptoms with the six in-scope diseases (Dengue, Diarrhea, Influenza, Measles, Pneumonia, Typhoid). These conditions can confuse symptom-based classification and should be flagged as out-of-scope by the verification layer.

**Purpose:**
1. Add out-of-scope flag samples to the disease classification dataset
2. Expand the clinical concept ontology with relevant SNOMED CT / ICD-10 codes

---

## Table of Contents

1. [Dengue Mimickers](#1-dengue-mimickers)
2. [Typhoid Mimickers](#2-typhoid-mimickers)
3. [Influenza Mimickers](#3-influenza-mimickers)
4. [Measles Mimickers](#4-measles-mimickers)
5. [Pneumonia Mimickers](#5-pneumonia-mimickers)
6. [Diarrhea Mimickers](#6-diarrhea-mimickers)
7. [Ontology Code Summary](#ontology-code-summary)
8. [References](#references)

---

## 1. Dengue Mimickers

| Disease | Overlapping Symptoms | Differentiating Features | ICD-10 | SNOMED CT | MedDRA |
|---------|---------------------|-------------------------|--------|-----------|--------|
| **Chikungunya** | High fever, myalgia, arthralgia, rash, headache | Severe/persistent polyarthralgia (weeks-months); symmetric joint involvement; less thrombocytopenia | A92.0 | 111864006 | 10008691 |
| **Malaria** | High fever, chills, headache, myalgia, fatigue | Cyclical fever pattern (tertian/quartan); rigors with diaphoresis; anemia; hepatosplenomegaly; travel to endemic area | B50-B54 | 61462000 | 10025487 |
| **Leptospirosis** | Fever, myalgia, headache, conjunctival suffusion | Calf muscle tenderness; jaundice; oliguria; flood/water exposure history; biphasic illness | A27.9 | 77377001 | 10024264 |
| **Zika Virus** | Fever, rash, arthralgia, conjunctivitis | Milder fever (<38.5C); prominent conjunctivitis; less severe myalgia; potential neurological complications | A92.5 | 3928002 | 10082913 |
| **COVID-19** | Fever, fatigue, myalgia, headache | Anosmia/ageusia; respiratory symptoms (cough, dyspnea); longer incubation; no hemorrhagic manifestations | U07.1 | 840539006 | 10084268 |

### Key Clinical Decision Points for Dengue vs. Mimickers:
- **Chikungunya**: Joint pain severity and persistence (arthralgia > myalgia)
- **Malaria**: Cyclical fever pattern, rigors, anemia, travel history
- **Leptospirosis**: Calf pain, jaundice, flood exposure, dark urine
- **Zika**: Milder presentation, prominent conjunctivitis
- **COVID-19**: Anosmia/ageusia, respiratory symptoms

---

## 2. Typhoid Mimickers

| Disease | Overlapping Symptoms | Differentiating Features | ICD-10 | SNOMED CT | MedDRA |
|---------|---------------------|-------------------------|--------|-----------|--------|
| **Brucellosis** | Prolonged fever, malaise, headache, body aches | Undulating fever pattern; drenching sweats; sacroiliitis; animal/dairy exposure; chronic relapsing course | A23.9 | 75702008 | 10006227 |
| **Miliary Tuberculosis** | Fever, weight loss, fatigue, hepatosplenomegaly | Chronic cough (>2 weeks); night sweats; hemoptysis; miliary pattern on CXR; TB exposure history | A19.9 | 154283005 | 10044159 |
| **Scrub Typhus** | High fever, headache, myalgia, rash | Eschar at bite site (pathognomonic); maculopapular rash; regional lymphadenopathy; outdoor/rural exposure | A75.3 | 240613006 | 10039812 |
| **Infectious Mononucleosis** | Fever, fatigue, pharyngitis, lymphadenopathy | Exudative pharyngitis; posterior cervical lymphadenopathy; splenomegaly; atypical lymphocytes; younger age group | B27.9 | 271558008 | 10021673 |

### Key Clinical Decision Points for Typhoid vs. Mimickers:
- **Brucellosis**: Undulating fever, drenching sweats, animal contact
- **Miliary TB**: Chronic cough, night sweats, hemoptysis, CXR findings
- **Scrub Typhus**: Eschar (black necrotic lesion at bite site), outdoor exposure
- **Infectious Mono**: Exudative pharyngitis, posterior lymphadenopathy, young patients

---

## 3. Influenza Mimickers

| Disease | Overlapping Symptoms | Differentiating Features | ICD-10 | SNOMED CT | MedDRA |
|---------|---------------------|-------------------------|--------|-----------|--------|
| **COVID-19** | Fever, cough, fatigue, myalgia, headache | Anosmia/ageusia (highly specific); longer symptom duration; GI symptoms; hypoxia without dyspnea | U07.1 | 840539006 | 10084268 |
| **RSV (Respiratory Syncytial Virus)** | Fever, cough, rhinorrhea, wheezing | More prominent wheezing/bronchiolitis; affects infants/elderly primarily; seasonal (winter); less myalgia | J21.0 | 55735004 | 10038898 |
| **Parainfluenza** | Fever, cough, sore throat, rhinorrhea | Prominent croup (barking cough); hoarseness; stridor; primarily pediatric; less systemic symptoms | J06.9 | 407479009 | 10033714 |
| **Human Metapneumovirus** | Fever, cough, rhinorrhea, wheezing | Similar to RSV; affects young children and elderly; bronchiolitis pattern; seasonal overlap with flu | J21.1 | 442696006 | 10067711 |

### Key Clinical Decision Points for Influenza vs. Mimickers:
- **COVID-19**: Anosmia/ageusia, longer duration, silent hypoxia
- **RSV**: Wheezing/bronchiolitis, infant/elderly population
- **Parainfluenza**: Croup, barking cough, stridor, pediatric
- **hMPV**: RSV-like presentation, specific populations

---

## 4. Measles Mimickers

| Disease | Overlapping Symptoms | Differentiating Features | ICD-10 | SNOMED CT | MedDRA |
|---------|---------------------|-------------------------|--------|-----------|--------|
| **Rubella (German Measles)** | Fever, maculopapular rash, lymphadenopathy | Milder fever; posterior auricular/occipital lymphadenopathy (prominent); arthralgia in adults; shorter duration | B06.9 | 36653000 | 10039471 |
| **Roseola (Exanthem Subitum)** | High fever, rash | Rash appears AFTER fever resolves (pathognomonic); rose-pink macules on trunk; infants 6-24 months; HHV-6/7 | B08.2 | 31368003 | 10039163 |
| **Kawasaki Disease** | Fever, rash, conjunctivitis, oral changes | Prolonged fever (>5 days); strawberry tongue; peeling extremities; coronary artery involvement; elevated CRP (>3 mg/dL) | M30.3 | 75053002 | 10023320 |
| **Scarlet Fever** | Fever, rash, pharyngitis | Sandpaper texture rash; strawberry tongue; circumoral pallor; Pastia lines; recent strep infection | A38 | 30242009 | 10039525 |
| **Erythema Infectiosum (Fifth Disease)** | Fever, rash | "Slapped cheek" appearance; lacy reticular rash on extremities; arthralgias in adults; parvovirus B19 | B08.3 | 65399007 | 10015228 |

### Key Clinical Decision Points for Measles vs. Mimickers:
- **Rubella**: Milder, posterior auricular nodes, adult arthralgia
- **Roseola**: Rash AFTER fever defervescence (fever-then-rash pattern)
- **Kawasaki**: Prolonged fever, strawberry tongue, peeling skin, elevated CRP
- **Scarlet Fever**: Sandpaper rash, circumoral pallor, strep history
- **Fifth Disease**: Slapped cheek rash, lacy rash pattern

### Laboratory Biomarkers (PMC5937975):
| Biomarker | Measles | Kawasaki Disease |
|-----------|---------|------------------|
| CRP | Normal to mild elevation | >3 mg/dL (elevated) |
| LDH | >800 mg/dL (elevated) | Normal |
| AST | Elevated | Usually normal |

---

## 5. Pneumonia Mimickers

| Disease | Overlapping Symptoms | Differentiating Features | ICD-10 | SNOMED CT | MedDRA |
|---------|---------------------|-------------------------|--------|-----------|--------|
| **Pulmonary Tuberculosis** | Cough, fever, fatigue, weight loss | Chronic cough (>2 weeks); night sweats; hemoptysis; apical lung involvement; TB exposure; slow progression | A15.0 | 154283005 | 10044159 |
| **Pertussis (Whooping Cough)** | Cough, fever (mild), respiratory distress | Paroxysmal cough with "whoop"; post-tussive vomiting; prolonged coughing spells; catarrhal prodrome | A37.9 | 27836007 | 10034746 |
| **Mycoplasma Pneumonia** | Cough, fever, fatigue, headache | "Walking pneumonia"; dry/non-productive cough; gradual onset; younger patients; bullous myringitis | J15.7 | 312349006 | 10028085 |
| **Legionella Pneumonia** | High fever, cough, dyspnea, fatigue | GI symptoms (diarrhea); hyponatremia; confusion/encephalopathy; contaminated water exposure; severe presentation | A48.1 | 312350006 | 10024133 |
| **Pulmonary Embolism** | Dyspnea, chest pain, tachycardia | Sudden onset; pleuritic chest pain; hemoptysis; DVT risk factors; hypoxia disproportionate to exam findings | I26.9 | 59282003 | 10037377 |

### Key Clinical Decision Points for Pneumonia vs. Mimickers:
- **TB**: Chronic cough, night sweats, hemoptysis, slow progression
- **Pertussis**: Paroxysmal cough, inspiratory whoop, post-tussive vomiting
- **Mycoplasma**: Walking pneumonia, dry cough, younger patients
- **Legionella**: GI symptoms, confusion, water exposure history
- **Pulmonary Embolism**: Sudden onset, DVT risk factors, disproportionate hypoxia

---

## 6. Diarrhea Mimickers

| Disease | Overlapping Symptoms | Differentiating Features | ICD-10 | SNOMED CT | MedDRA |
|---------|---------------------|-------------------------|--------|-----------|--------|
| **Cholera** | Profuse watery diarrhea, dehydration, vomiting | "Rice water" stool; massive fluid loss (>1L/hour); rapid severe dehydration; minimal abdominal pain; endemic area | A00.9 | 63650001 | 10008647 |
| **Shigellosis** | Diarrhea, fever, abdominal cramps | Bloody/mucoid stool; tenesmus; small volume frequent stools; high fever; fecal leukocytes | A03.9 | 36188001 | 10040482 |
| **Campylobacter Enteritis** | Diarrhea, fever, abdominal pain | Bloody diarrhea; severe cramping; poultry exposure; prodromal fever before diarrhea; longer duration | A04.5 | 302231008 | 10007001 |
| **Rotavirus** | Watery diarrhea, vomiting, fever | Primarily infants/young children; winter seasonality; profuse vomiting precedes diarrhea; respiratory symptoms | A08.0 | 18624000 | 10039424 |
| **Norovirus** | Diarrhea, vomiting, nausea, abdominal cramps | Sudden onset; prominent vomiting; outbreak setting (cruise ships, schools); short duration (24-72h); all ages | A08.1 | 407359000 | 10068529 |
| **Inflammatory Bowel Disease** | Chronic diarrhea, abdominal pain, fatigue | Chronic/relapsing course; bloody stools; extraintestinal manifestations (arthritis, skin); weight loss | K50-K52 | 24526004 | 10022653 |

### Key Clinical Decision Points for Diarrhea vs. Mimickers:
- **Cholera**: Rice water stool, massive dehydration, minimal pain
- **Shigellosis**: Bloody/mucoid, tenesmus, high fever
- **Campylobacter**: Bloody, severe cramps, poultry exposure
- **Rotavirus**: Infants, winter, vomiting precedes diarrhea
- **Norovirus**: Sudden onset, prominent vomiting, outbreak setting
- **IBD**: Chronic relapsing, extraintestinal manifestations

---

## Ontology Code Summary

### Complete Code Reference Table

| Disease | ICD-10 | SNOMED CT | MedDRA |
|---------|--------|-----------|--------|
| Chikungunya | A92.0 | 111864006 | 10008691 |
| Malaria | B50-B54 | 61462000 | 10025487 |
| Leptospirosis | A27.9 | 77377001 | 10024264 |
| Zika Virus | A92.5 | 3928002 | 10082913 |
| COVID-19 | U07.1 | 840539006 | 10084268 |
| Brucellosis | A23.9 | 75702008 | 10006227 |
| Miliary TB | A19.9 | 154283005 | 10044159 |
| Scrub Typhus | A75.3 | 240613006 | 10039812 |
| Infectious Mononucleosis | B27.9 | 271558008 | 10021673 |
| RSV Infection | J21.0 | 55735004 | 10038898 |
| Parainfluenza | J06.9 | 407479009 | 10033714 |
| Human Metapneumovirus | J21.1 | 442696006 | 10067711 |
| Rubella | B06.9 | 36653000 | 10039471 |
| Roseola | B08.2 | 31368003 | 10039163 |
| Kawasaki Disease | M30.3 | 75053002 | 10023320 |
| Scarlet Fever | A38 | 30242009 | 10039525 |
| Erythema Infectiosum | B08.3 | 65399007 | 10015228 |
| Pulmonary TB | A15.0 | 154283005 | 10044159 |
| Pertussis | A37.9 | 27836007 | 10034746 |
| Mycoplasma Pneumonia | J15.7 | 312349006 | 10028085 |
| Legionella Pneumonia | A48.1 | 312350006 | 10024133 |
| Pulmonary Embolism | I26.9 | 59282003 | 10037377 |
| Cholera | A00.9 | 63650001 | 10008647 |
| Shigellosis | A03.9 | 36188001 | 10040482 |
| Campylobacter Enteritis | A04.5 | 302231008 | 10007001 |
| Rotavirus Infection | A08.0 | 18624000 | 10039424 |
| Norovirus Infection | A08.1 | 407359000 | 10068529 |
| Inflammatory Bowel Disease | K50-K52 | 24526004 | 10022653 |

---

## References

1. **Dengue Mimickers Systematic Review**
   - Source: Revista da Sociedade Brasileira de Medicina Tropical
   - PMC ID: PMC11654470
   - Key findings: Comprehensive analysis of conditions mimicking dengue fever

2. **Typhoid Fever Differential Diagnosis**
   - Authors: Bhutta ZA
   - Source: BMJ (2006)
   - PMC ID: PMC1489205
   - DOI: Available via PMC
   - Key findings: Differential includes malaria, brucellosis, TB, leptospirosis, rickettsial diseases

3. **Measles vs. Kawasaki Disease Differentiation**
   - Source: Mediterranean Journal of Infectious Diseases
   - PMC ID: PMC5937975
   - Key findings: CRP >3 mg/dL (Kawasaki) vs. LDH >800 mg/dL (Measles)

4. **IDSA Clinical Practice Guidelines for Infectious Diarrhea**
   - Source: Infectious Diseases Society of America (2017)
   - PMC ID: PMC5850553
   - Key findings: Evidence-based differential diagnosis for acute diarrheal illness

5. **Chikungunya vs. Dengue Clinical Differentiation**
   - Key finding: Persistent polyarthralgia (weeks-months) distinguishes chikungunya

6. **Roseola Clinical Pattern**
   - Key finding: "Fever-then-rash" pattern (rash appears AFTER fever resolves)

7. **COVID-19 Distinctive Features**
   - Key finding: Anosmia/ageusia highly specific (60-80% of cases)

8. **Leptospirosis Clinical Presentation**
   - Key finding: Calf muscle tenderness + flood exposure + jaundice triad

---

## Usage Notes

### For Dataset Augmentation
Use the symptom patterns and differentiating features to create synthetic "out-of-scope" samples that the model should flag rather than classify into the 6 in-scope diseases.

### For Ontology Integration
The ICD-10 and SNOMED CT codes can be added to `backend/app/config.py` in the `CLINICAL_CONCEPTS` dictionary to enable the verification layer to detect these conditions.

### For Clinical Decision Support
The differentiating features provide guidance for follow-up questions that can help rule out mimicker conditions.

---

*Last Updated: March 2026*
*Research conducted using academic-researcher skill with literature from PubMed/PMC*
