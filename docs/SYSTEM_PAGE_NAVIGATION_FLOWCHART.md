# System Page Navigation Flowchart

This document maps the whole-page navigation across the AI'll Be Sick frontend, including role-based entry paths, auth flows, patient pages, clinician/admin pages, and guard redirects.

```mermaid
flowchart TD
  Start([User opens app]) --> Root["/"]

  Root --> RootAuth{Authenticated?}
  RootAuth -- No --> Login["/login"]
  RootAuth -- Yes --> Role{Role}

  Role -- PATIENT --> PatientOnboard{Onboarded?}
  PatientOnboard -- No --> Onboarding["/onboarding"]
  PatientOnboard -- Yes --> Diagnosis["/diagnosis"]

  Role -- CLINICIAN --> ClinStatus{Approval status}
  ClinStatus -- Pending --> Waiting["/waiting-for-approval"]
  ClinStatus -- Rejected --> ClinLogin["/clinician-login"]
  ClinStatus -- Approved --> Map["/map"]

  Role -- ADMIN --> PendingClinicians["/pending-clinicians"]
  Role -- DEVELOPER --> DevView{Saved developer view}
  DevView -- Patient view --> Diagnosis
  DevView -- Clinician view --> Map
  DevView -- Admin view --> PendingClinicians

  subgraph Public_Auth[Public + Auth]
    Login --> VerifyEmail["/verify-email"]
    Login --> OAuthStart[Google OAuth]
    OAuthStart --> AuthCallback["/auth/callback"]
    AuthCallback --> Root
    AuthCallback --> AuthCodeError["/auth/auth-code-error"]

    Login --> NeedAccount["/need-account"]
    NeedAccount --> Login
    Login --> ClinLogin
    Login --> AdminLogin["/admin-login"]
    Login --> Privacy["/privacy"]
    Login --> Terms["/terms"]

    ClinLogin --> ClinForgot["/clinician-forgot-password"]
    ClinForgot --> ClinReset["/clinician-reset-password"]
    ClinReset --> ClinLogin
    ClinLogin --> Waiting
    ClinLogin --> Login
    ClinLogin --> AdminLogin

    AdminLogin --> Login
    AdminLogin --> ClinLogin

    VerifyEmail --> Login
    Waiting --> ClinLogin

    Terms --> Privacy
    Terms --> Login
    Privacy --> Terms
    Privacy --> Login

    AuthCodeError --> Login
    AuthCodeError --> Root
    AuthConfirm["/auth/confirm"] --> Root
    AuthConfirm --> ErrorPage["/error (target route)"]
    SyncError["/auth/sync-error"] --> Login
    SyncError --> Root
  end

  subgraph Patient_Area[Patient App Area]
    Diagnosis --> History["/history"]
    History --> Profile["/profile"]
    Profile --> Diagnosis

    History --> ChatDetail["/diagnosis/:chatId"]
    ChatDetail --> History
  end

  subgraph Operations_Area[Clinician + Admin Operations Area]
    Map --> Dashboard["/dashboard"]
    Dashboard --> Alerts["/alerts"]
    Alerts --> Reports["/healthcare-reports"]
    Reports --> Users["/users"]
    Users --> Map

    Map --> ClinicianProfile["/clinician-profile"]
    Dashboard --> ClinicianProfile
    Alerts --> ClinicianProfile
    Reports --> ClinicianProfile
    Users --> ClinicianProfile
  end

  subgraph Admin_Area[Admin-only Approvals]
    PendingClinicians -. admin only .-> Map
    Map -. admin only .-> PendingClinicians
    Dashboard -. admin only .-> PendingClinicians
    Alerts -. admin only .-> PendingClinicians
    Reports -. admin only .-> PendingClinicians
    Users -. admin only .-> PendingClinicians
    PendingClinicians -. admin only .-> ClinicianProfile
  end

  Standalone["/comparison"]:::standalone

  Root --> SyncError
  Diagnosis --> Unauthorized["/unauthorized"]
  Diagnosis --> Forbidden["/forbidden"]
  Map --> ClinLogin
  Map --> Waiting

  classDef standalone fill:#f5f5f5,stroke:#888,stroke-dasharray: 5 5
```
