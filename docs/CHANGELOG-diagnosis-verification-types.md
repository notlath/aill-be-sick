# Changelog: Diagnosis Verification Types Branch

This changelog documents the changes in the `fix/diagnosis-verification-types` branch, implementing diagnosis verification and rejection tracking, enhancing clinical override functionality with auto-verification, and improving verification dashboard statistics.

## Features

### Diagnosis Verification and Rejection Tracking

- **feat:** add verification and rejection tracking for diagnoses in User and Diagnosis models
  - Added status field to Diagnosis model with PENDING default
  - Added verifiedAt, verifiedBy, rejectedAt, rejectedBy fields for audit tracking
  - Added relations to User model for verifier and rejector users
  - Technical details: Updated `frontend/prisma/schema.prisma` to include verification fields with proper indexing

- **feat:** link clinical override to automatic verification and unify detail modals
  - Clinical overrides now automatically trigger verification status
  - Unified diagnosis detail modals to show verification status
  - Technical details: Updated diagnosis override actions to set verification fields

- **feat:** enhance diagnosis override functionality with auto-verification and transaction support
  - Diagnosis overrides now include transaction support for data consistency
  - Auto-verification enabled for overridden diagnoses
  - Technical details: Enhanced `frontend/actions/override-diagnosis.ts` with transaction logic and verification updates

### Dashboard Statistics Enhancements

- **refactor:** centralize reliability thresholds, remove Impetigo, and enhance verification dashboard stats
  - Centralized reliability thresholds in configuration
  - Removed Impetigo from supported diseases
  - Enhanced verification dashboard with improved statistics display
  - Technical details: Updated threshold configurations and dashboard components in `frontend/components/clinicians/dashboard-page/verification-dashboard.tsx`

## Fixes

- **fix:** add missing verification fields to diagnosis select
  - Fixed database queries to include new verification fields in diagnosis selections
  - Technical details: Updated Prisma select queries in diagnosis-related actions and components

## Documentation

- **chore:** re-run baseline BCMB vs with MCD notebook
  - Updated notebooks with revised symptom-disease dataset
  - Added notebooks for ClinicalBERT and BioBERT fine-tuning
  - Technical details: Updated `notebooks/` with new training data and models

This changelog is formatted for AI agents and developers, including file paths and technical implementation details.