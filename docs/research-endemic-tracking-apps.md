# Competitive Analysis: Endemic Disease Tracking Apps in the Philippines & Southeast Asia

## Executive Summary

This research identifies existing disease surveillance and clinical decision support systems in the Philippines and Southeast Asia to inform the development of AI'll Be Sick's endemic tracking features. The analysis reveals a gap in **patient-facing CDSS tools** that combine AI-based diagnosis with community-level outbreak detection.

---

## 1. Government Systems (Philippines)

### 1.1 FHSIS (Field Health Services Information System)
- **Type**: National facility-based recording/reporting system
- **Operator**: DOH (Department of Health)
- **Coverage**: Nationwide, from Barangay Health Stations → RHUs → CHDs → DOH-EB
- **Purpose**: Provides data for planning, budgeting, and decision-making at all LGU levels
- **Data**: Notifiable diseases, morbidity, mortality rates
- **Limitations**: 
  - Paper-based at lower levels
  - No AI/ML components
  - No patient-facing interface
  - Reporting delays common

### 1.2 FASSSTER (Feasibility Analysis of Syndromic Surveillance using Spatio-Temporal Epidemiological Modeler)
- **Developer**: Ateneo de Manila University (ADMU)
- **Operator**: DOST → transferred to DOH (2022)
- **Type**: Cloud-based disease surveillance platform
- **Features**:
  - Spatio-temporal epidemiological modeling
  - Predictive forecasting (COVID-19 projections)
  - Risk assessment by geographic area
  - LGU-level dashboards
- **Used for**: COVID-19 pandemic management (Delta wave projections)
- **Limitations**:
  - Government/institutional access only
  - No individual patient diagnosis
  - Focus on population-level trends

### 1.3 DataCollect App (DOH)
- **Purpose**: Daily data collection from hospitals
- **Data**: Hospital bed availability, essential resources/supplies
- **Limitations**: Hospital-focused, not community health

### 1.4 QVID
- **Type**: Contact tracing system for LGUs
- **Features**: QR code-based data gathering
- **Status**: COVID-era tool, limited ongoing use

---

## 2. Research/Academic Systems (Philippines)

### 2.1 Mozzify
- **Source**: PMC/NIH Research (2020)
- **Type**: Integrated mHealth app for dengue
- **Features**:
  - Real-time dengue case reporting
  - Geographic mapping of cases
  - Health communication/education
  - Behavior modification prompts
- **Target**: Community-level dengue surveillance
- **Relevance to AI'll Be Sick**: Similar geographic mapping approach, but Mozzify is dengue-specific and lacks AI diagnosis

### 2.2 PASYENTE Mobile
- **Source**: ResearchGate (2024)
- **Type**: Patient-centered mHealth app
- **Features**:
  - AI-powered dengue symptom monitoring
  - Early detection capabilities
  - Patient self-assessment
- **Relevance**: Most similar to AI'll Be Sick's patient-facing approach, but dengue-only

### 2.3 DengueCare
- **Platform**: Google Play Store
- **Operator**: Buhangin Health Center (Davao)
- **Purpose**: Dengue surveillance for local health unit
- **Features**: Case monitoring, morbidity trend analysis
- **Limitations**: Single-disease, single-locality

### 2.4 HealthPH (Intelligent Disease Surveillance)
- **Developer**: DOST-PCHRD funded
- **Type**: Social media surveillance
- **Features**:
  - Analyzes public posts in English, Filipino, Cebuano
  - Identifies symptom-related keywords
  - Detects disease-related discussions
- **Limitations**: Passive surveillance only, no patient interaction

### 2.5 Automated Barangay Health Records System (Iligan City)
- **Type**: Electronic health records for barangay level
- **Features**:
  - Real-time health record uploading
  - Morbidity/mortality rate viewing
- **Limitations**: Record-keeping focus, no diagnostic AI

---

## 3. Southeast Asian Systems

### 3.1 EDAM (Electronic Decision support for Acute fever Management)
- **Source**: BMJ Open (2024)
- **Coverage**: South and Southeast Asia
- **Type**: Clinical decision support algorithm (mobile app)
- **Purpose**: Diagnosis and management of acute fever
- **Target Users**: Healthcare workers in resource-limited settings
- **Relevance**: Most similar clinical approach to AI'll Be Sick, but fever-specific and clinician-only

### 3.2 Survey-based AI CDSS (Frontiers in Public Health, 2022)
- **Setting**: Resource-limited settings (Indonesia focus)
- **Type**: Simplified AI for clinical decision support
- **Key Finding**: "Simplified artificial intelligence could be helpful in clinical decision support in settings with limited resources"
- **Relevance**: Validates AI'll Be Sick's approach for resource-limited Philippine settings

### 3.3 Indonesia Infectious Disease Apps
- **Government**: Death rate and recovery tracking
- **Challenge**: Fragmented systems across different diseases

### 3.4 NepaDengue (Nepal)
- **Type**: Mobile app for dengue prevention/control
- **Status**: Feasibility study shows promising results

### 3.5 MozzHub
- **Type**: Dengue hotspot detector
- **Features**: User-friendly interface for identifying high-risk areas

---

## 4. Key Gaps Identified

| Feature | FHSIS | FASSSTER | Mozzify | EDAM | AI'll Be Sick |
|---------|-------|----------|---------|------|---------------|
| Patient-facing | ❌ | ❌ | ✅ | ❌ | ✅ |
| AI-powered diagnosis | ❌ | ❌ | ❌ | ✅ | ✅ |
| Multi-disease support | ✅ | ✅ | ❌ | ❌ | ✅ |
| Uncertainty quantification | ❌ | ❌ | ❌ | ❌ | ✅ |
| Barangay-level tracking | ✅ | ✅ | ✅ | ❌ | ✅ |
| Outbreak detection | ❌ | ✅ | ❌ | ❌ | ✅ |
| Clinician override | N/A | N/A | N/A | N/A | 🔄 (Planned) |
| Filipino/Cebuano support | ❌ | ❌ | ❌ | ❌ | ✅ |

**Legend**: ✅ = Yes, ❌ = No, 🔄 = In Development

---

## 5. Competitive Advantages of AI'll Be Sick

1. **Multi-disease AI diagnosis**: Unlike dengue-specific apps (Mozzify, DengueCare, PASYENTE), supports multiple infectious diseases
2. **Uncertainty quantification**: Monte Carlo Dropout provides confidence scores and flags low-confidence cases
3. **Dual user roles**: Both patients and healthcare workers, unlike clinician-only tools (EDAM)
4. **Bilingual support**: Filipino and English, matching local language needs
5. **Outbreak detection**: K-Means + Isolation Forest, similar to FASSSTER but with patient-level data
6. **Barangay integration**: Designed for Barangay Health Centers (pilot: Bagong Silangan)

---

## 6. Recommendations for Endemic Tracking Feature

Based on competitive analysis:

### 6.1 Endemic Status Indicator
- Display endemic/outbreak status on dashboard (similar to FASSSTER's risk assessment)
- Use existing outbreak detection (K-Means + Isolation Forest) to classify:
  - **Endemic**: Baseline disease presence in area
  - **Elevated**: Above-average but not outbreak
  - **Outbreak**: Statistically significant spike

### 6.2 Differentiation Strategy
- **Don't replicate**: FHSIS reporting (government handles this)
- **Do implement**: Patient-level insights that complement government systems
- **Unique value**: AI diagnosis + geographic clustering for early warning

### 6.3 Barangay Health Worker Features
- Case summaries (anonymized) per barangay
- Trend visualization over time
- Export capability for FHSIS reporting integration

---

## 7. Sources

1. DOH CAR - FHSIS 2022 Annual Technical Report
2. UNDP - FASSSTER Strategy Note (2022)
3. Ateneo - FASSSTER COVID-19 Platform Recognition (2022)
4. PMC/NIH - Mozzify mHealth App for Dengue (2020)
5. ResearchGate - PASYENTE Mobile for Dengue (2024)
6. BMJ Open - EDAM Clinical Decision Support (2024)
7. Frontiers in Public Health - Survey-based AI CDSS (2022)
8. DOST-PCHRD - HealthPH Intelligent Disease Surveillance
9. Google Play - DengueCare App

---

*Research conducted: March 2026*
*For: AI'll Be Sick Thesis Project - Endemic Tracking Feature Implementation*
