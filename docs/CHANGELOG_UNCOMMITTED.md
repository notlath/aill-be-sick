# Uncommitted Changes Changelog

This document summarizes all currently uncommitted modifications across the codebase, primarily focused on unifying the authentication UI and improving error handling flows.

## 🎨 UI/UX Redesign (Authentication Pages)

The authentication pages have been completely overhauled to share a consistent, production-grade visual language using the established DaisyUI/Tailwind design system.

### Patient Login (`frontend/app/(auth)/login/page.tsx`)
- **Layout & Structure**: Transitioned to a clean `bg-base-100` background for the form column to improve contrast and readability.
- **Brand Header**: Added a Stethoscope icon with a soft green `bg-primary/10` rounded square next to a "Patient Portal" label.
- **Typography & Rhythm**: Split the main heading with a green accent on the app name. Tightened vertical spacing (`space-y-1.5`) between input labels and fields for a better visual rhythm.
- **Entrance Animations**: Implemented staggered entrance animations (`animate-fade-in` and `animate-slide-up`) using existing `globals.css` keyframes.
- **Hero Panel (Right Column)**: Transformed the raw stock photo into an integrated hero panel by adding a dark neutral overlay (`bg-neutral/50`). Fixed text contrast issues by switching text to `text-neutral-content` (white) and adding a subtle `text-shadow (0 1px 4px rgba(0,0,0,0.6))` to ensure legibility against any background image. Added a descriptive text overlay highlighting the "Trusted Health Partner" value proposition.
- **Footer Links**: Cleaned up the footer navigation, adding a top border separator and explicit "Clinician sign in" / "Admin sign in" links.

### Admin Login (`frontend/app/(auth)/admin-login/page.tsx`)
- **Design Alignment**: Applied the exact same layout composition, spacing scale, animations, and color tokens from the patient login page.
- **Role-Specific Branding**: Updated the brand header to feature a Shield icon and an "Admin Portal" label.
- **Hero Panel Context**: Replaced the plain image with an integrated hero panel featuring "System Administration" context text, describing the admin's role in managing clinicians and overseeing system operations.
- **Functionality Preserved**: All admin-specific auth logic, form handlers, and schemas remain completely untouched.

### Clinician Login (`frontend/app/(auth)/clinician-login/page.tsx`)
- **Design Alignment**: Applied the consistent auth layout structure and animation system.
- **Role-Specific Branding**: Features a Stethoscope icon and a "Clinician Portal" label, preserving the crucial note that new accounts require admin approval.
- **Hero Panel Context**: Added a "Clinician Dashboard" overlay to the hero image summarizing clinician capabilities (managing patients, reviewing AI diagnoses).
- **Functionality Preserved**: The "Forgot Password?" link and "Create clinician account" button logic remain exactly as they were, simply restyled to match the new token system.

## ⚙️ Routing & Error Handling Improvements

### Auth Callback Handler (`frontend/app/auth/callback/route.ts`)
- **Google OAuth Flow Fix**: Modified the behavior when a Google sign-in encounters an unregistered user. Instead of redirecting to the `/need-account` page, the system now redirects back to the login page with an error parameter (`/login?oauth_error=not_found`).

### OAuth Error Display (`frontend/app/(auth)/login/page.tsx`)
- **Error UI**: The patient login page now specifically watches for the `oauth_error` URL parameter using `useSearchParams`. If present, it triggers a warning alert rendering: *"No account found for this Google address. Please visit Bagong Silangan Barangay Health Center to register."* This significantly improves the user experience for unauthorized patients attempting Google SSO.

### Need Account Page (`frontend/app/(auth)/need-account/page.tsx`)
- **Support Link**: Added a new helper paragraph at the bottom of the page: *"I already have an account but can't log in — get help"*, routing users efficiently to the `/support` page for recovery.
