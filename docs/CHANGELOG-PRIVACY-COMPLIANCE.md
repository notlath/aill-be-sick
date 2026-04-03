# Changelog - Privacy Compliance

All notable changes to the AI'll Be Sick project for privacy compliance implementation.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-04-03

### Added
- **Privacy Policy Page**: Added `/privacy` route with comprehensive privacy policy content compliant with PDPA
- **Terms of Service Page**: Added `/terms` route with terms of service and user agreements
- **Privacy Rights Management**: Added `/privacy-rights` page allowing users to view consent status, manage preferences, and exercise data rights
- **User Consent Tracking**: Implemented database fields for privacy and terms acceptance tracking (`privacyAcceptedAt`, `privacyVersion`, `termsAcceptedAt`, `termsVersion`)
- **Data Export Functionality**: Added server actions for users to export their personal data in JSON format
- **Consent Withdrawal**: Implemented functionality for users to withdraw consent and reset privacy/term acceptance
- **Account Deletion**: Added secure account deletion with complete data removal from database
- **Anonymized Patient Identifiers**: Generated anonymized IDs for patient data in clinician views to protect privacy
- **Consent Modal**: Added onboarding consent modal requiring privacy and terms acceptance
- **Legal Footer**: Implemented footer component with links to privacy policy and terms across the application
- **Version Control for Legal Documents**: Added version checking to force re-acceptance when terms or privacy policies are updated
- **PDPA Compliance Documentation**: Created comprehensive compliance documentation in `docs/LEGality_COMPLIANCE.md`
- **Privacy Actions**: Added `frontend/actions/privacy-actions.ts` with server actions for data management
- **Privacy Schemas**: Created Zod schemas in `frontend/schemas/privacy-actions.ts` for data export, consent withdrawal, and account deletion

### Security
- **PHI Protection**: Implemented anonymization of patient data in clinician dashboards
- **Data Minimization**: Ensured only necessary data is collected and processed
- **User Data Control**: Provided users with full control over their data through export, deletion, and consent management
- **Compliance with PDPA**: Adhered to Philippine Data Privacy Act requirements for personal information handling