# System Page Navigation Flowchart

This document maps the whole-page navigation across the AI'll Be Sick frontend, including role-based entry paths, auth flows, patient pages, clinician/admin pages, and guard redirects.

## Overview

The application uses Next.js App Router with role-based access control. Users are routed based on authentication status, role (Patient, Clinician, Admin, Developer), and approval status. The system enforces guards that redirect unauthorized or unapproved users to appropriate pages.

## Navigation Flowchart

```mermaid
flowchart TD
    %% ========== ENTRY POINT ==========
    Start([User opens app]) --> Root["/"]
    Root --> RootAuth{Authenticated?}

    %% ========== UNAUTHENTICATED FLOW ==========
    RootAuth -- No --> Login["/login"]

    Login --> VerifyEmail["/verify-email"]
    VerifyEmail --> Login

    Login --> OAuthStart[Google OAuth]
    OAuthStart --> AuthCallback["/auth/callback"]
    AuthCallback --> Root
    AuthCallback --> AuthCodeError["/auth/auth-code-error"]
    AuthCodeError --> Login
    AuthCodeError --> Root

    Login --> NeedAccount["/need-account"]
    NeedAccount --> Login

    Login --> ClinLogin["/clinician-login"]
    Login --> AdminLogin["/admin-login"]

    ClinLogin --> ClinForgot["/clinician-forgot-password"]
    ClinForgot --> ClinReset["/clinician-reset-password"]
    ClinReset --> ClinLogin

    ClinLogin --> Login
    ClinLogin --> AdminLogin

    AdminLogin --> Login
    AdminLogin --> ClinLogin

    Login --> Privacy["/privacy"]
    Login --> Terms["/terms"]
    Terms --> Privacy
    Terms --> Login
    Privacy --> Terms
    Privacy --> Login

    %% ========== AUTHENTICATED FLOW ==========
    RootAuth -- Yes --> Role{Role}

    %% --- Patient Role ---
    Role -- PATIENT --> Diagnosis["/diagnosis"]

    %% --- Clinician Role ---
    Role -- CLINICIAN --> ClinStatus{Approval status}
    ClinStatus -- Pending --> Waiting["/waiting-for-approval"]
    ClinStatus -- Rejected --> ClinLogin
    ClinStatus -- Approved --> Map["/map"]

    %% --- Admin Role ---
    Role -- ADMIN/DEVELOPER --> PendingClinicians["/pending-clinicians"]

    %% --- Developer Role ---
    Role -- DEVELOPER --> DevView{Saved developer view}
    DevView -- Patient view --> Diagnosis
    DevView -- Clinician view --> Map
    DevView -- Admin view --> PendingClinicians

    %% ========== PATIENT APP AREA ==========
    Diagnosis --> History["/history"]
    History --> Profile["/profile"]
    Profile --> PrivacyRights["/privacy-rights"]
    PrivacyRights --> Profile
    Profile --> Diagnosis

    History --> ChatDetail["/diagnosis/:chatId"]
    ChatDetail --> History

    %% ========== CLINICIAN OPERATIONS AREA ==========
    Map --> Dashboard["/dashboard"]
    Dashboard --> Map
    Dashboard --> Alerts["/alerts"]
    Alerts --> Reports["/healthcare-reports"]
    Reports --> Users["/users"]
    Users --> UserDetail["/users/:id"]
    UserDetail --> Users
    Users --> Map
    Users --> CreatePatient["/create-patient"]
    CreatePatient --> Users

    Map --> ClinicianProfile["/clinician-profile"]
    Dashboard --> ClinicianProfile
    Alerts --> ClinicianProfile
    Reports --> ClinicianProfile
    Users --> ClinicianProfile
    CreatePatient --> ClinicianProfile

    %% ========== ADMIN-ONLY AREA ==========
    PendingClinicians -. admin only .-> Map
    Map -. admin only .-> PendingClinicians
    Dashboard -. admin only .-> PendingClinicians
    Alerts -. admin only .-> PendingClinicians
    Reports -. admin only .-> PendingClinicians
    Users -. admin only .-> PendingClinicians
    PendingClinicians -. admin only .-> ClinicianProfile

    %% ========== ERROR & GUARD PAGES ==========
    Root --> SyncError["/auth/sync-error"]
    SyncError --> Login
    SyncError --> Root

    Diagnosis --> Unauthorized["/unauthorized"]
    Diagnosis --> Forbidden["/forbidden"]

    Map --> ClinLogin
    Map --> Waiting

    AuthConfirm["/auth/confirm"] --> Root
    AuthConfirm --> ErrorPage["/error (target route)"]

    Waiting --> ClinLogin

    %% ========== STANDALONE PAGES ==========
    Standalone["/comparison"]:::standalone

    %% ========== STYLES ==========
    classDef standalone fill:#f5f5f5,stroke:#888,stroke-dasharray: 5 5
    classDef authNode fill:#e3f2fd,stroke:#1976d2
    classDef patientNode fill:#e8f5e9,stroke:#388e3c
    classDef clinicianNode fill:#fff3e0,stroke:#f57c00
    classDef adminNode fill:#fce4ec,stroke:#c2185b
    classDef errorNode fill:#ffebee,stroke:#d32f2f

    %% Apply styles to nodes
    class Login,VerifyEmail,OAuthStart,AuthCallback,AuthCodeError,NeedAccount,ClinLogin,AdminLogin,ClinForgot,ClinReset,Privacy,Terms,AuthConfirm,SyncError authNode
    class Diagnosis,History,Profile,PrivacyRights,ChatDetail patientNode
    class Map,Dashboard,Alerts,Reports,Users,CreatePatient,ClinicianProfile,Waiting clinicianNode
    class PendingClinicians adminNode
    class Unauthorized,Forbidden,ErrorPage errorNode
```

## Legend

### Node Types

| Shape   | Meaning          |
| ------- | ---------------- |
| `([ ])` | Start/End point  |
| `[ ]`   | Page/Route       |
| `{ }`   | Decision point   |
| `[/ /]` | External process |

### Line Types

| Style  | Meaning                      |
| ------ | ---------------------------- |
| `-->`  | Normal navigation flow       |
| `-.->` | Admin-only restricted access |

### Color Coding

| Color         | Area                        |
| ------------- | --------------------------- |
| Blue          | Authentication & Auth flows |
| Green         | Patient app area            |
| Orange        | Clinician operations area   |
| Pink          | Admin-only area             |
| Gray (dashed) | Standalone pages            |
| Red           | Error & guard pages         |

## Route Reference

### Public Routes (Unauthenticated)

- `/login` — Main login page
- `/verify-email` — Email verification page
- `/need-account` — Account selection page
- `/clinician-login` — Clinician login page
- `/admin-login` — Admin login page
- `/clinician-forgot-password` — Clinician password reset request
- `/clinician-reset-password` — Clinician password reset form
- `/privacy` — Privacy policy
- `/terms` — Terms of service
- `/auth/callback` — OAuth callback handler
- `/auth/auth-code-error` — OAuth error page
- `/auth/confirm` — Auth confirmation handler
- `/auth/sync-error` — Auth sync error page
- `/auth/expired-invite` — Expired invite error page
- `/auth/onboarding` — Onboarding page
- `/patient/set-password` — Patient password setting page (from invite link)

### Patient Routes (Authenticated + Patient Role)

- `/diagnosis` — Main diagnosis interface
- `/diagnosis/:chatId` — Individual chat/diagnosis detail
- `/history` — Diagnosis history
- `/profile` — Patient profile management
- `/privacy-rights` — Privacy rights dashboard and data management

### Clinician Routes (Authenticated + Approved Clinician)

- `/map` — Disease surveillance map
- `/dashboard` — Clinician dashboard (group overview cards open map via explicit **Open group on map** button)
- `/alerts` — Alert management
- `/healthcare-reports` — Healthcare reports and analytics
- `/users` — Patient/user management
- `/users/:id` — Individual user detail and account deletion management
- `/create-patient` — Create new patient account
- `/clinician-profile` — Clinician profile management
- `/waiting-for-approval` — Pending approval page (for unapproved clinicians)

### Admin Routes (Authenticated + Admin Role)

- `/pending-clinicians` — Clinician approval management

### Error & Guard Routes

- `/unauthorized` — Unauthorized access page
- `/forbidden` — Forbidden access page
- `/error` — Generic error page (target route)

### Standalone Routes

- `/comparison` — Diagnosis comparison tool

## Navigation Guards

### Authentication Guard

- **Trigger**: User not authenticated
- **Action**: Redirect to `/login`
- **Applies to**: All protected routes

### Clinician Approval Guard

- **Trigger**: Clinician role but not approved
- **Action**: Redirect to `/waiting-for-approval`
- **Applies to**: All clinician routes

### Role-Based Access Guard

- **Trigger**: User lacks required role
- **Action**: Redirect to `/unauthorized` or `/forbidden`
- **Applies to**: Role-specific routes

### Admin-Only Guard

- **Trigger**: Non-admin user accessing admin routes
- **Action**: Redirect to appropriate role landing page
- **Applies to**: `/pending-clinicians` and admin-only features

## Technical Notes

1. **OAuth Flow**: Google OAuth redirects to `/auth/callback`, which processes the token and redirects to `/` for re-evaluation
2. **Developer View**: Developers can switch between patient, clinician, and admin views via saved preference
3. **Clinician Profile**: Accessible from all clinician operations pages for quick profile updates
4. **Chat Detail**: `/diagnosis/:chatId` allows patients to view previous diagnosis sessions
5. **Admin Navigation**: Admins can access `/pending-clinicians` from any clinician operations page via dotted-line connections
6. **Error Recovery**: Auth sync errors redirect to `/login` or `/` to allow retry
7. **Comparison Tool**: `/comparison` is a standalone page not integrated into main navigation flow
