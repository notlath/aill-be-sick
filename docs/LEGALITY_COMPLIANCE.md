# Legality and Compliance

## Overview

This document outlines the legality policies, compliance with the Philippine Data Privacy Act (Republic Act No. 10173), data handling procedures, user rights, and relevant legal frameworks for the AI'll Be Sick application. AI'll Be Sick is a medical diagnostic application that processes symptom data to provide disease predictions, handling sensitive personal health information (PHI). Compliance with PDPA is mandatory to protect user privacy and ensure lawful data processing.

## Philippine Data Privacy Act (RA 10173)

### Summary
The Data Privacy Act of 2012 (RA 10173) is the primary law governing data privacy in the Philippines. It protects the fundamental human right to privacy by regulating the collection, processing, storage, and sharing of personal information. The law applies to all entities processing personal data of Philippine residents, including government agencies, private corporations, and individuals. Enforcement is handled by the National Privacy Commission (NPC), which oversees compliance, conducts investigations, and imposes penalties for violations.

### Key Principles
RA 10173 establishes seven core data privacy principles that must be adhered to:

1. **Lawfulness, Fairness, and Transparency**: Personal data must be processed lawfully, fairly, and in a transparent manner. Users must be informed about data collection and processing activities.
2. **Purpose Limitation**: Data may only be collected for specified, legitimate purposes and must not be further processed in a way incompatible with those purposes.
3. **Proportionality**: Data processing must be adequate, relevant, and limited to what is necessary for the intended purpose.
4. **Data Quality and Accuracy**: Personal data must be accurate, up-to-date, and complete.
5. **Security Safeguards**: Appropriate technical and organizational measures must be implemented to protect personal data against unauthorized access, alteration, disclosure, or destruction.
6. **Rights of Data Subjects**: Individuals have rights over their personal data, including access, rectification, erasure, and portability.
7. **Accountability**: Organizations must demonstrate compliance with these principles and implement privacy management programs.

### Sensitive Personal Information
Health-related data, such as symptoms and medical history, is classified as sensitive personal information under RA 10173. Processing of sensitive data requires explicit consent and is subject to stricter rules:
- Consent must be obtained in writing or through clear affirmative action.
- Processing is only permitted for specific purposes directly related to the health context.
- Additional security measures, such as encryption and access controls, are mandatory.
- Breaches involving sensitive data must be reported to the NPC within 72 hours.

## Data Handling Procedures

### Collection
- Data is collected only for the purpose of providing symptom-based disease predictions.
- Collection occurs through user-submitted symptom questionnaires and medical history forms.
- Minimal data principle: Only necessary information is collected (e.g., symptoms, age, gender; no unnecessary identifiers).

### Processing
- Data processing includes analysis by machine learning models to generate predictions.
- Processing is performed server-side in the backend (Flask API) with results stored securely.
- Anonymization techniques are applied where possible to minimize risks.

### Storage
- Data is stored in PostgreSQL databases via Prisma ORM.
- All data is encrypted at rest and in transit using industry-standard protocols (e.g., TLS 1.3).
- Access is restricted to authorized personnel and roles (e.g., clinicians, admins).

### Retention
- Personal data is retained only as long as necessary for the purpose (e.g., diagnosis history for user reference).
- Data is deleted or anonymized after the retention period or upon user request, unless retention is required by law (e.g., for medical records).

### Security Measures
- Role-based access control (RBAC) implemented across the application.
- Regular security audits and vulnerability assessments.
- Incident response plan for data breaches, including notification procedures.

## User Rights

Under RA 10173, users have the following rights regarding their personal data:

- **Right to be Informed**: Users must be notified about the collection and processing of their data, including purposes, recipients, and their rights.
- **Right to Access**: Users can request access to their personal data held by the application.
- **Right to Rectification**: Users can request correction of inaccurate or incomplete data.
- **Right to Erasure**: Users can request deletion of their data, subject to legal limitations.
- **Right to Object**: Users can object to processing based on legitimate interests.
- **Right to Data Portability**: Users can request their data in a structured, commonly used format.
- **Right to Withdraw Consent**: Users can withdraw consent for data processing at any time.

These rights are exercised through in-app features, such as account settings, or by contacting support.

## Consent Management

- **Explicit Consent**: Users provide explicit consent for data processing during account creation and symptom submission.
- **Granular Consent**: Consent is specific to purposes (e.g., diagnosis, research aggregation anonymized).
- **Sensitive Data Consent**: For health data, consent is obtained via a clear affirmative action (e.g., checkbox with terms).
- **Consent Records**: All consents are logged with timestamps and audit trails.
- **Withdrawal**: Users can withdraw consent through account settings, triggering immediate cessation of processing.

## Data Export

- Users can request a data export of their personal information via the application interface.
- Exported data is provided in a portable, machine-readable format (e.g., JSON or CSV).
- Requests are processed within 30 days, and users are notified of any delays.

## Deletion

- Users can request data deletion through account settings or by contacting support.
- Upon request, data is permanently deleted from active databases, backups, and logs (subject to legal retention requirements).
- Confirmation of deletion is provided to the user.
- Exceptions: Data may be retained if required for legal compliance (e.g., medical malpractice claims).

## Withdrawal

- Withdrawal of consent stops all data processing activities.
- Users can withdraw via the app or support channels.
- Upon withdrawal, data is deleted or anonymized, and processing ceases.
- Users are informed of the implications of withdrawal (e.g., inability to access diagnosis history).

## Audit Trails

- All data processing activities are logged, including access, modifications, and deletions.
- Logs include timestamps, user IDs, and actions performed.
- Audit trails are reviewed regularly for compliance and security.
- Logs are retained for a minimum of 3 years as required by PDPA.

## Compliance Verification

- **Privacy Management Program (PMP)**: A comprehensive PMP is implemented, including policies, procedures, and training.
- **Data Protection Officer (DPO)**: Designated DPO oversees compliance and handles data subject requests.
- **Regular Audits**: Annual audits conducted by external parties to verify adherence to PDPA.
- **Self-Assessment**: Quarterly self-assessments to identify and mitigate risks.
- **Reporting**: Breaches and non-compliance incidents are reported to the NPC as required.
- **Training**: All staff receive regular privacy training.

## Legal Frameworks

In addition to RA 10173, the application complies with related laws and frameworks:

- **Republic Act No. 11038 (Expanded National Integrated Protected Areas System Act)**: For environmental data if applicable, but primarily PDPA for health.
- **Republic Act No. 8792 (Electronic Commerce Act)**: Governs electronic transactions and data in commerce.
- **Implementing Rules and Regulations (IRR) of PDPA**: Detailed guidelines issued by the NPC.
- **International Standards**: Alignment with GDPR principles where applicable, though PDPA is the binding law.
- **Medical Ethics**: Adherence to Philippine Medical Association guidelines for health data handling.

## Conclusion

Compliance with RA 10173 and related laws is integral to the operation of AI'll Be Sick. This document serves as a reference for maintaining legal and ethical standards. Regular reviews and updates ensure ongoing compliance. For questions or requests, contact the Data Protection Officer.