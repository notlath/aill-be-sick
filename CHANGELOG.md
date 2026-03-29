# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Created a clinician-managed patient account provisioning flow, allowing clinicians to generate accounts with temporary passwords.
- Added a forced password change flow for newly provisioned patient accounts upon their first login.
- Integrated a secure server-side utility to bypass Row Level Security for admin-level user creation without sending confirmation emails.
- Added dual-path patient account creation: clinicians can create accounts with or without email addresses.
- Implemented access code authentication for patients without email (format: `PAT-XXXXXX`).
- Added email verification requirement - patients with email must verify before accessing diagnoses.
- Created credential regeneration feature allowing clinicians to reset patient passwords and access codes.
- Added logout server action for user session management.
- Created `/verify-email-pending` page with resend verification email option.
- Added tabbed login interface (Email / Access Code) on the login page.

### Changed
- Removed patient self-signup forms and Google OAuth options from the login page to strictly enforce clinician-led onboarding.
- Updated the database schema to include a tracking field for users who must change their passwords.
- Made patient email field optional in the database schema to support access code authentication.
- Added `emailVerified` boolean field to track email verification status.
- Added `patientAccessCode` unique field for access code-based login.

### Fixed
- Fixed an issue causing the Flask backend to crash during startup by providing a fallback loader for the Hugging Face `TokenizersBackend`.
- Fixed the clinician account creation flow by explicitly providing the application URL to ensure Supabase correctly triggers the verification email.
