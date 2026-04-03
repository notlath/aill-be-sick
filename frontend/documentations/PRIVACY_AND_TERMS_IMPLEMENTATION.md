# Privacy Policy and Terms of Service Implementation

This document provides a comprehensive overview of the Privacy Policy and Terms of Service system implemented for AI'll Be Sick, a thesis research project for disease detection deployed at Bagong Silangan Health Center in Quezon City.

## Table of Contents

1. [Overview](#overview)
2. [Database Schema Changes](#database-schema-changes)
3. [New Files Created](#new-files-created)
4. [Modified Files](#modified-files)
5. [User Flows](#user-flows)
6. [Version Management](#version-management)
7. [Testing Guide](#testing-guide)
8. [Configuration & Placeholders](#configuration--placeholders)

---

## Overview

### Purpose

The system implements:

- **Privacy Policy** and **Terms of Service** pages with research-focused language
- **Consent tracking** in the database with version management
- **Consent flow** for new signups (checkboxes on signup form)
- **Consent modal** for existing users, OAuth users, and users needing to re-accept after terms updates
- **Age gate** for minors (18+ or parental permission checkbox)
- **Footer links** to legal pages on patient and clinician layouts
- **Medical disclaimers** prominently displayed throughout the application

### Key Design Decisions

1. **Research-focused language**: All legal text emphasizes this is a thesis research project, not a commercial service
2. **Non-dismissible consent modal**: Users cannot bypass consent - modal blocks entire app until accepted
3. **Version-based re-acceptance**: When terms version changes, existing users must re-accept
4. **Auto-recorded diagnoses**: Users are informed diagnoses are automatically recorded and retained by the health center
5. **Minors supported with permission**: Users under 18 can use the system with parental/guardian permission

---

## Database Schema Changes

### File: `prisma/schema.prisma`

Added four new fields to the `User` model:

```prisma
model User {
  // ... existing fields ...

  // Consent tracking fields
  termsAcceptedAt   DateTime? // When user accepted Terms of Service
  privacyAcceptedAt DateTime? // When user accepted Privacy Policy
  termsVersion      String?   // Version of Terms accepted (e.g., "1.0")
  privacyVersion    String?   // Version of Privacy Policy accepted (e.g., "1.0")
}
```

### Migration

Run the following to apply schema changes:

```bash
cd frontend
npx prisma generate
npx prisma db push
```

---

## New Files Created

### 1. Legal Constants

**File:** `constants/legal.ts`

Central configuration for all legal-related constants and placeholders.

```typescript
export const LEGAL_CONSTANTS = {
  // Version numbers - increment these when terms change
  TERMS_VERSION: "1.0",
  PRIVACY_VERSION: "1.0",
  LAST_UPDATED: "March 18, 2026",

  // Institution information
  HOSPITAL_NAME: "Bagong Silangan Health Center",
  BARANGAY_NAME: "Bagong Silangan, Quezon City",
  INSTITUTION_NAME: "[Institution Name]", // TODO: Replace with actual institution

  // Contact information (placeholders)
  CONTACT_EMAIL: "[contact-email@example.com]", // TODO: Replace
  CONTACT_PHONE: "[+63 XXX XXX XXXX]", // TODO: Replace
  CONTACT_ADDRESS: "[Full Address]", // TODO: Replace

  // Research information
  ETHICS_STATUS: "Pending institutional review",
  RESEARCH_LEAD: "[Research Lead Name]", // TODO: Replace
  FACULTY_ADVISOR: "[Faculty Advisor Name]", // TODO: Replace

  // Supported diseases
  SUPPORTED_DISEASES: [
    "Dengue",
    "Pneumonia",
    "Typhoid",
    "Diarrhea",
    "Measles",
    "Influenza",
  ],

  // Data retention
  DATA_RETENTION_PERIOD: "duration of the research study",
};
```

### 2. Version Checking Utility

**File:** `utils/check-terms-version.ts`

Utility functions for checking if users need to accept updated terms.

```typescript
// Check if user needs to accept updated terms
export function needsTermsUpdate(user: UserWithConsent): boolean;

// Get detailed information about what needs updating
export function getTermsUpdateInfo(user: UserWithConsent): TermsUpdateInfo;
```

**Returns:**

- `needsUpdate`: Boolean indicating if consent modal should show
- `reasons`: Array of human-readable reasons why update is needed
- `missingTerms`: Whether Terms of Service acceptance is missing/outdated
- `missingPrivacy`: Whether Privacy Policy acceptance is missing/outdated

### 3. Privacy Policy Page

**File:** `app/(auth)/privacy/page.tsx`

Complete Privacy Policy page with 9 sections:

1. Introduction (with medical disclaimer alert)
2. Information We Collect
3. How We Use Your Information
4. Data Storage and Security
5. Data Sharing
6. Your Rights
7. Minors
8. Changes to This Policy
9. Contact Us

### 4. Terms of Service Page

**File:** `app/(auth)/terms/page.tsx`

Complete Terms of Service page with 11 sections:

1. Introduction (with prominent medical disclaimer)
2. Important Medical Disclaimer (repeated, highlighted)
3. Acceptance of Terms
4. Description of Service
5. User Responsibilities
6. Data Collection and Privacy
7. Intellectual Property
8. Disclaimers and Limitations
9. Changes to Terms
10. Governing Law
11. Contact Us

### 5. Signup Schema with Consent

**File:** `schemas/SignupWithConsentSchema.ts`

Zod schemas for validating consent during signup and in consent modal.

```typescript
// For new user signup (includes email/password + consent)
export const SignupWithConsentSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  acceptedMedicalDisclaimer: requiredConsent("..."),
  acceptedAgeRequirement: requiredConsent("..."),
  acceptedTermsAndPrivacy: requiredConsent("..."),
});

// For consent modal (existing users, OAuth users)
export const ConsentOnlySchema = z.object({
  acceptedMedicalDisclaimer: requiredConsent("..."),
  acceptedAgeRequirement: requiredConsent("..."),
  acceptedTermsAndPrivacy: requiredConsent("..."),
});
```

### 6. Accept Terms Server Action

**File:** `actions/accept-terms.ts`

Server action to record user consent acceptance.

```typescript
export const acceptTerms = actionClient
  .inputSchema(ConsentOnlySchema)
  .action(async ({ parsedInput }) => {
    // Validates all consent flags are true
    // Updates user record with timestamps and versions
    // Revalidates cache
  });
```

### 7. Consent Modal Component

**File:** `components/consent-modal.tsx`

Non-dismissible modal for existing users and OAuth users.

**Features:**

- Blocks entire app until consent given
- Shows reasons why consent is needed (optional prop)
- Prominent medical disclaimer
- Three required checkboxes
- Links to Privacy Policy and Terms of Service
- Version information display

**Props:**

```typescript
interface ConsentModalProps {
  reasons?: string[]; // Optional reasons to display
}
```

### 8. Legal Footer Component

**File:** `components/shared/legal-footer.tsx`

Footer component with links to legal pages.

```typescript
const LegalFooter = () => (
  <footer>
    <Link href="/privacy">Privacy Policy</Link>
    <Link href="/terms">Terms of Service</Link>
    <span>© 2026 AI'll Be Sick Research Project</span>
  </footer>
);
```

---

## Modified Files

### 1. Patient Auth Action

**File:** `actions/patient-auth.ts`

**Changes:**

- Updated to use `SignupWithConsentSchema` for signup validation
- Records consent timestamps and versions when creating new users

```typescript
// In patientSignup action
await prisma.user.create({
  data: {
    // ... existing fields ...
    termsAcceptedAt: new Date(),
    privacyAcceptedAt: new Date(),
    termsVersion: LEGAL_CONSTANTS.TERMS_VERSION,
    privacyVersion: LEGAL_CONSTANTS.PRIVACY_VERSION,
  },
});
```

### 2. Login Page

**File:** `app/(auth)/login/page.tsx`

**Changes:**

- Added toggle between Login and Signup modes
- Signup form includes three consent checkboxes:
  1. Medical disclaimer acknowledgment
  2. Age requirement (18+ or parental permission)
  3. Terms and Privacy acceptance
- Medical disclaimer alert shown in signup mode
- Links to Privacy Policy and Terms of Service

### 3. Patient Layout

**File:** `app/(app)/(patient)/layout.tsx`

**Changes:**

- Imports and uses `needsTermsUpdate` and `getTermsUpdateInfo`
- Checks if logged-in user needs to accept terms
- Renders `ConsentModal` if consent needed
- Adds `LegalFooter` to bottom of layout

```typescript
// In PatientLayout
const user = await getCurrentDbUser();
if ("success" in user) {
  const termsInfo = getTermsUpdateInfo(user.success);
  if (termsInfo.needsUpdate) {
    return (
      <>
        <ConsentModal reasons={termsInfo.reasons} />
        {/* rest of layout */}
      </>
    );
  }
}
```

### 5. Clinician Layout

**File:** `app/(app)/(clinician)/layout.tsx`

**Changes:**

- Same consent checking logic as patient layout
- Renders `ConsentModal` if consent needed
- Adds `LegalFooter` to bottom of layout

---

## User Flows

### Flow 1: New User Signup (Email/Password)

```
1. User visits /login
2. User clicks "Create an account" to switch to signup mode
3. User sees:
   - Email field
   - Password field
   - Medical disclaimer alert (prominent)
   - Three consent checkboxes (all required)
   - Links to Privacy Policy and Terms of Service
4. User fills form and checks all boxes
5. User clicks "Create Account"
6. Consent recorded with timestamps and versions
7. User redirected to verify email
```

### Flow 2: New User Signup (Google OAuth)

```
1. User visits /login
2. User clicks "Continue with Google"
3. User completes Google authentication
4. User redirected to app
5. App detects no consent recorded
6. ConsentModal appears (non-dismissible)
7. User checks all boxes and clicks "Accept & Continue"
8. Consent recorded
9. User can now use the app
```

### Flow 3: Existing User (No Previous Consent)

```
1. Existing user logs in
2. App checks consent status
3. No consent found (legacy user)
4. ConsentModal appears with reason: "You haven't yet accepted our terms"
5. User accepts terms
6. User can continue using app
```

### Flow 4: Terms Version Update

```
1. Admin updates TERMS_VERSION in constants/legal.ts (e.g., "1.0" → "1.1")
2. Existing user logs in
3. App compares user.termsVersion ("1.0") with current ("1.1")
4. Mismatch detected
5. ConsentModal appears with reason: "Terms of Service updated to v1.1"
6. User re-accepts terms
7. User's termsVersion updated to "1.1"
```

### Flow 5: Patient Creation (Clinician-Initiated)

```
1. Clinician navigates to /create-patient
2. Clinician fills in patient details including location via Mapbox
3. Patient account created with complete profile data
4. Patient receives temporary credentials
5. Patient logs in and goes directly to diagnosis page
6. Patient may be prompted for consent if not already given
```

---

## Version Management

### How Version Checking Works

The system compares stored versions against current versions:

```typescript
// In utils/check-terms-version.ts
const termsOutdated =
  !user.termsVersion || user.termsVersion !== LEGAL_CONSTANTS.TERMS_VERSION;

const privacyOutdated =
  !user.privacyVersion ||
  user.privacyVersion !== LEGAL_CONSTANTS.PRIVACY_VERSION;
```

### Updating Terms

To release updated terms:

1. Update the legal page content (`app/(auth)/terms/page.tsx` or `app/(auth)/privacy/page.tsx`)
2. Increment version in `constants/legal.ts`:
   ```typescript
   TERMS_VERSION: "1.1", // was "1.0"
   LAST_UPDATED: "April 1, 2026",
   ```
3. Deploy changes
4. All users will see consent modal on next visit

### Version History

| Version | Date           | Changes         |
| ------- | -------------- | --------------- |
| 1.0     | March 18, 2026 | Initial release |

---

## Testing Guide

### Test Cases

#### 1. New User Signup

- [ ] Visit `/login` and switch to signup mode
- [ ] Verify medical disclaimer alert is visible
- [ ] Verify all three checkboxes are present and unchecked
- [ ] Try to submit without checking boxes → should show validation errors
- [ ] Check all boxes and submit → should succeed
- [ ] Verify user record has consent fields populated

#### 2. Existing User Without Consent

- [ ] Find/create user without consent fields set
- [ ] Log in as that user
- [ ] Verify ConsentModal appears
- [ ] Verify modal cannot be dismissed (no X button, clicking backdrop does nothing)
- [ ] Accept terms → modal closes, app accessible

#### 3. Google OAuth User

- [ ] Sign out completely
- [ ] Click "Continue with Google"
- [ ] Complete OAuth flow
- [ ] Verify ConsentModal appears immediately after redirect
- [ ] Accept terms → can use app

#### 4. Version Update Re-acceptance

- [ ] Log in as user with consent recorded
- [ ] Change `TERMS_VERSION` in constants to "1.1"
- [ ] Refresh page
- [ ] Verify ConsentModal appears with version update reason
- [ ] Accept → user's version updated to "1.1"

#### 5. Footer Links

- [ ] Log in as patient → footer visible with Privacy and Terms links
- [ ] Log in as clinician → footer visible with Privacy and Terms links
- [ ] Click links → pages load correctly

#### 6. Legal Pages

- [ ] Visit `/privacy` directly → page loads
- [ ] Visit `/terms` directly → page loads
- [ ] Verify all sections render correctly
- [ ] Verify placeholder text is marked with TODO comments in code

---

## Configuration & Placeholders

### Items Requiring Configuration Before Production

All placeholders are marked with `// TODO:` comments in `constants/legal.ts`:

| Item             | Current Value                  | Location                           |
| ---------------- | ------------------------------ | ---------------------------------- |
| Institution Name | `[Institution Name]`           | `LEGAL_CONSTANTS.INSTITUTION_NAME` |
| Contact Email    | `[contact-email@example.com]`  | `LEGAL_CONSTANTS.CONTACT_EMAIL`    |
| Contact Phone    | `[+63 XXX XXX XXXX]`           | `LEGAL_CONSTANTS.CONTACT_PHONE`    |
| Contact Address  | `[Full Address]`               | `LEGAL_CONSTANTS.CONTACT_ADDRESS`  |
| Research Lead    | `[Research Lead Name]`         | `LEGAL_CONSTANTS.RESEARCH_LEAD`    |
| Faculty Advisor  | `[Faculty Advisor Name]`       | `LEGAL_CONSTANTS.FACULTY_ADVISOR`  |
| Ethics Status    | `Pending institutional review` | `LEGAL_CONSTANTS.ETHICS_STATUS`    |

### Updating Placeholders

1. Open `frontend/constants/legal.ts`
2. Replace placeholder values with actual information
3. Remove TODO comments
4. Consider incrementing version if significant changes made

---

## File Summary

### New Files (8)

| File                                 | Purpose                             |
| ------------------------------------ | ----------------------------------- |
| `constants/legal.ts`                 | Legal constants and placeholders    |
| `utils/check-terms-version.ts`       | Version checking utilities          |
| `app/(auth)/privacy/page.tsx`        | Privacy Policy page                 |
| `app/(auth)/terms/page.tsx`          | Terms of Service page               |
| `schemas/SignupWithConsentSchema.ts` | Zod schemas for consent validation  |
| `actions/accept-terms.ts`            | Server action for recording consent |
| `components/consent-modal.tsx`       | Non-dismissible consent modal       |
| `components/shared/legal-footer.tsx` | Footer with legal links             |

### Modified Files (5)

| File                               | Changes                                   |
| ---------------------------------- | ----------------------------------------- |
| `prisma/schema.prisma`             | Added 4 consent fields to User model      |
| `actions/patient-auth.ts`          | Updated signup to record consent          |
| `app/(auth)/login/page.tsx`        | Added signup mode with consent checkboxes |
| `app/(app)/(patient)/layout.tsx`   | Added consent check and footer            |
| `app/(app)/(clinician)/layout.tsx` | Added consent check and footer            |

---

## Troubleshooting

### Common Issues

#### "All consent checkboxes must be accepted" error

- Ensure all three checkboxes are checked before submitting
- Check browser console for JavaScript errors

#### Consent modal not appearing for existing users

- Verify user's `termsAcceptedAt` is null in database
- Check that `needsTermsUpdate()` is being called in layout
- Clear browser cache and cookies

#### Version mismatch not triggering re-acceptance

- Verify `LEGAL_CONSTANTS.TERMS_VERSION` was actually changed
- Check user's stored `termsVersion` in database
- Ensure comparison logic is correct (string comparison)

#### Build errors related to Zod schemas

- Ensure using `z.boolean().refine()` pattern, not `z.literal(true)`
- Run `npx prisma generate` after schema changes

---

## Future Enhancements

Potential improvements for future iterations:

1. **Consent audit log**: Track all consent acceptance/revocation events
2. **Granular consent**: Allow users to accept/reject specific data uses
3. **Consent withdrawal**: Allow users to withdraw consent (with consequences)
4. **Email notifications**: Notify users when terms are updated
5. **Admin dashboard**: View consent statistics and compliance metrics
6. **PDF downloads**: Allow users to download signed consent forms
7. **Multi-language support**: Translate legal pages to Filipino/Tagalog
