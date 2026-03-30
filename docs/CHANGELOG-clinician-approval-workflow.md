# Changelog: Clinician Approval Workflow Branch

This changelog documents the changes in the `feat/clinician-approval-workflow` branch, implementing comprehensive clinician approval, patient creation, role hierarchy, and authentication improvements.

## Features

### Workflow Enhancements

- **feat(workflow):** update clinician approval workflow to include Developer role
  - Extended approval workflow to support DEVELOPER role in addition to CLINICIAN
  - Technical details: Updated `frontend/actions/admin-clinician-approvals.ts` to include DEVELOPER in approval logic, ensuring hierarchical permissions

- **feat(workflow):** enhance clinician approval and patient creation workflows
  - Improved integration between clinician approval and patient management
  - Added validation for role-based access in workflow actions

- **feat:** Implement clinician approval workflow, including account creation flowchart, admin actions for approval/rejection, and user role validation
  - New clinician approval system with admin dashboard for pending approvals
  - Updated `docs/ACCOUNT_CREATION_FLOWCHART.md` to reflect new approval steps
  - Added `frontend/app/(app)/(clinician)/pending-clinicians/page.tsx` for pending clinician management
  - Server actions: `frontend/actions/admin-clinician-approvals.ts` for approve/reject functionality

### Authentication Improvements

- **feat:** redesign login page with improved UI, OAuth error handling, and new support page navigation
  - Complete UI overhaul of authentication pages using DaisyUI design system
  - Added OAuth error handling for unregistered Google users
  - New support page navigation links
  - Technical details: Updated `frontend/app/(auth)/login/page.tsx`, `frontend/app/(auth)/admin-login/page.tsx`, `frontend/app/(auth)/clinician-login/page.tsx` with consistent layout, animations, and hero panels

- **feat(auth):** implement patient invite resend and expired invite handling
  - Added resend invite functionality for patients
  - Handling for expired invites
  - New action: `frontend/actions/resend-invite.ts`

- **feat(auth):** restrict Google sign-in to pre-registered patients
  - Changed authentication flow to require pre-registration for Google OAuth
  - Breaking change: Users must be pre-registered to use Google sign-in

- **feat(patient):** replace temp passwords with invite-based account creation
  - Switched from temporary passwords to secure invite links
  - Updated patient onboarding process

### Role Hierarchy System

- **feat(role-hierarchy):** implement role hierarchy utility and update permission checks across actions
  - New hierarchical permission system: PATIENT < CLINICIAN < ADMIN < DEVELOPER
  - Created `frontend/utils/role-hierarchy.ts` for consistent permission checks
  - Updated all server actions to use hierarchical checks instead of strict role equality
  - Architectural change: Centralized permission logic for maintainability

### Patient Management

- **feat(clinician):** add patient creation feature with documentation updates
  - Clinicians can now create patient accounts
  - Updated documentation for patient creation process

- **feat(patient):** expand role-based permissions for patient creation and use admin client for auth
  - Enhanced permissions for patient account creation based on user role
  - Integrated admin Supabase client for authentication

- **feat(patient):** remove onboarding flow and add Mapbox geocoding for patient creation
  - Removed patient onboarding process
  - Added Mapbox geocoding for location data in patient profiles
  - Breaking change: Onboarding flow removed, patients created directly

### UI/UX Improvements

- **feat:** add dark mode support and styling refinements to create patient form components
  - Added dark mode toggle and styling
  - Refined form components for better usability

- **feat:** Add comprehensive documentation for reusable UI components, including PasswordInput usage and guidelines
  - New documentation for UI components in `frontend/components/ui/README.md`

- **feat:** Update header and navigation components to support admin role and enhance user experience
  - Enhanced navigation for admin users
  - Updated header components

- **feat:** Enhance header and view switcher components for improved user role handling and navigation
  - Improved role-based navigation

- **feat:** Remove fixed header component to streamline patient layout
  - Simplified header layout for patients

### Backend Diagnostic Improvements

- **feat:** implement three-tier concept classification system to improve diagnostic safety and handle unrelated medical categories
  - Enhanced ML service for better disease classification
  - Technical details: Updated `backend/app/services/ml_service.py`, added logic to categorize concepts into medical, non-medical, and out-of-scope

- **feat:** Add out-of-scope disease mimickers documentation with clinical ontology codes and a dedicated changelog
  - New documentation for out-of-scope conditions
  - Added `docs/out-of-scope-diseases.md` with clinical ontology codes

### Documentation and Configuration

- **feat:** Add mandatory pre-completion checklist and update account creation flowchart for new patient navigation
  - Updated checklists in AGENTS.md for development workflow

- **feat:** Remove toggle mode functionality and add Need Account page
  - Removed toggle mode
  - Added need account page for unregistered users
  - Breaking change: Toggle mode removed

- **feat:** Update .gitignore to include .aider\* and ensure skills-lock.json is properly listed
  - Updated version control exclusions

- **feat:** Update navigation documentation requirements to ensure sync with frontend route changes
  - Updated `docs/SYSTEM_PAGE_NAVIGATION_FLOWCHART.md`

- **feat:** Implement Fool-Proof + Clinical Rigor framework across documentation and workflows
  - Enhanced documentation for error recovery and usability

## Fixes

- **fix(patient):** handle existing Supabase auth users during patient creation
  - Improved handling of duplicate auth users in Supabase

- **fix:** Update tokenizer to use PreTrainedTokenizerFast for improved compatibility
  - Backend fix: Updated tokenizer in ML pipeline for better performance

## Refactors

- **refactor(clinician):** move resend invite logic to action
  - Moved logic to dedicated server action

- **refactor:** update Prisma schema to consolidate database configuration and reorganize User and Diagnosis model fields
  - Database schema improvements

- **refactor(clinician):** move user actions to table column
  - UI refactor for clinician user management

- **refactor(patient):** restructure name fields and remove unused fields
  - Cleaned up patient data model

## Documentation

- **feat(docs):** Add BRANCH_REVIEW_CHECKLIST.md documentation
  - New checklist for branch reviews

- **docs(auth):** add expired invite, support, and onboarding pages to auth navigation
  - Updated navigation docs

- **docs:** Update validation checklist in Copilot configuration to include navigation flowchart updates for role-guard behavior changes
  - Updated Copilot configs

## Breaking Changes

- Removed patient onboarding flow - patients are now created directly by clinicians
- Restricted Google sign-in to pre-registered patients only
- Removed toggle mode functionality from authentication

## Architectural Changes

- Implemented role hierarchy system with centralized permission checks
- Introduced clinician approval workflow with admin oversight
- Switched to invite-based patient account creation

This changelog is formatted for AI agents and developers, including file paths and technical implementation details.
