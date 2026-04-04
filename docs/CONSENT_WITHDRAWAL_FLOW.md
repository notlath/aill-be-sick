# Consent Withdrawal & Re-Acceptance Flow

```mermaid
flowchart TD
    A[User clicks Withdraw Consent button] --> B{Confirmation dialog}
    B -->|Cancel| C[Flow ends - consent remains active]
    B -->|Confirm| D[executeWithdraw called]

    D --> E[withdrawConsent Server Action]
    E --> F[getCurrentDbUser]
    F --> G{User authenticated?}
    G -->|No| H[Return error: User not authenticated]
    G -->|Yes| I[Prisma: Update user]

    I --> J[Set privacyAcceptedAt = null]
    I --> K[Set termsAcceptedAt = null]
    J --> L[Create AuditLog: WITHDRAW_CONSENT]
    K --> L

    L --> M[revalidatePath /privacy-rights]
    M --> N[Return success message]
    N --> O[UI updates - consent status shows Not Accepted]

    O --> P{User navigates to protected route}
    P --> Q[Layout Server Component renders]
    Q --> R[needsTermsUpdate checks user]

    R --> S{privacyAcceptedAt or termsAcceptedAt is null?}
    S -->|No| T[User continues normally]
    S -->|Yes| U[ConsentModal renders]

    U --> V[Non-dismissible modal blocks app]
    V --> W[User reads Terms & Privacy]
    W --> X[User checks all 3 consent boxes]

    X --> Y[Accept & Continue button enabled]
    Y --> Z[acceptTerms Server Action called]

    Z --> AA[Prisma: Update user]
    AA --> AB[Set termsAcceptedAt = new Date]
    AA --> AC[Set privacyAcceptedAt = new Date]
    AA --> AD[Set termsVersion & privacyVersion]

    AB --> AE[revalidateTag user cache]
    AC --> AE
    AD --> AE
    AE --> AF[revalidatePath / and /diagnosis]
    AF --> AG[router.refresh]
    AG --> AH[ConsentModal dismissed]
    AH --> AI[User regains full app access]

    style A fill:#f9d71c,color:#000
    style U fill:#ff6b6b,color:#fff
    style AH fill:#4ecdc4,color:#000
    style J fill:#ff6b6b,color:#fff
    style K fill:#ff6b6b,color:#fff
    style AB fill:#4ecdc4,color:#000
    style AC fill:#4ecdc4,color:#000
```

## Flow Summary

### Withdrawal Path (Top)

1. User clicks the warning-styled "Withdraw Consent" button
2. Browser confirmation dialog appears
3. If confirmed, the `withdrawConsent` server action runs
4. Database sets `privacyAcceptedAt` and `termsAcceptedAt` to `null`
5. An audit log entry records the withdrawal
6. UI reflects the withdrawn status

### Re-Acceptance Path (Bottom)

1. On next navigation to any protected route, the layout checks consent status
2. `needsTermsUpdate()` detects null timestamps and returns `true`
3. `ConsentModal` renders as a non-dismissible overlay blocking the app
4. User must check all three consent checkboxes
5. Clicking "Accept & Continue" calls the `acceptTerms` server action
6. Database records new timestamps and current document versions
7. Cache is invalidated and page refreshes
8. Modal dismisses and full app access is restored

---

## Delete Account Flow

```mermaid
flowchart TD
    A[User clicks Delete Account button] --> B[showDeleteModal = true]
    B --> C[Delete Account modal renders]

    C --> D[User enters password]
    D --> E{Password field filled?}
    E -->|No| F[Delete button disabled]
    E -->|Yes| G[Delete button enabled]

    G --> H[User clicks Delete Account]
    H --> I[executeDelete called with password]
    I --> J[deleteAccount Server Action]

    J --> K[DeleteAccountSchema validates input]
    K --> L[getCurrentDbUser]
    L --> M{User authenticated?}
    M -->|No| N[Return error: Authentication required]
    M -->|Yes| O[Get Supabase session]

    O --> P{Session has access_token?}
    P -->|No| Q[Return error: No active session]
    P -->|Yes| R[DELETE /api/user/account]

    R --> S[Backend processes account deletion]
    S --> T{Backend success?}
    T -->|No| U[Return backend error message]
    T -->|Yes| V[revalidateTag user cache]

    V --> W[revalidatePath /]
    W --> X[revalidatePath /diagnosis]
    X --> Y[revalidatePath /profile]
    Y --> Z[Return success]

    Z --> AA[showDeleteModal = false]
    AA --> AB[window.location.href = /]
    AB --> AC[User redirected to home page]

    style A fill:#f9d71c,color:#000
    style C fill:#ff6b6b,color:#fff
    style R fill:#ff6b6b,color:#fff
    style AC fill:#4ecdc4,color:#000
```

### Delete Account Flow Summary

1. User clicks the error-styled "Delete Account" button (from `/profile` or privacy-rights page)
2. Delete Account modal renders with a password input field
3. User must enter their password — the Delete button stays disabled until password is provided
4. Clicking "Delete Account" calls the `deleteAccount` server action with the password
5. Server action validates input via `DeleteAccountSchema`
6. Authenticates user via `getCurrentDbUser()` and Supabase session
7. Sends `DELETE` request to backend at `/api/user/account` with Bearer token
8. Backend permanently deletes the account and anonymizes data
9. On success: cache tags are invalidated and paths (`/`, `/diagnosis`, `/profile`) are revalidated
10. Modal closes and user is redirected to the home page via `window.location.href = "/"`

---

## Clinician-Initiated Patient Deletion Flow (with Grace Period)

### Scheduling Deletion

```mermaid
flowchart TD
    A[Clinician navigates to patient detail page] --> B{Patient already scheduled?}
    B -->|Yes| C[Show scheduled alert + restore option]
    B -->|No| D[Show Danger Zone card]

    D --> E[Clinician clicks Delete Account]
    E --> F[Modal opens with reason textarea]
    F --> G[Clinician enters reason]
    G --> H[Clinician confirms Schedule Deletion]

    H --> I[schedulePatientDeletion Server Action]
    I --> J[ScheduleDeletionSchema validates]
    J --> K[POST /api/user/schedule-deletion]

    K --> L{Requester has CLINICIAN/ADMIN/DEVELOPER role?}
    L -->|No| M[Return error: Permission denied]
    L -->|Yes| N{Patient exists and not already scheduled?}

    N -->|No| O[Return error]
    N -->|Yes| P[Calculate scheduledDeletionAt = now + GRACE_PERIOD_DAYS]

    P --> Q[Insert DeletionSchedule record]
    Q --> R[Invalidate patient sessions via Supabase Admin API]
    R --> S[Create AuditLog: SCHEDULE_DELETION]
    S --> T[revalidatePath /users and /users/patientId]

    T --> U[Patient sees Grace Period Banner on next login]
    U --> V[30-day grace period countdown begins]

    style A fill:#3b82f6,color:#fff
    style E fill:#f9d71c,color:#000
    style K fill:#ff6b6b,color:#fff
    style U fill:#ff6b6b,color:#fff
    style V fill:#4ecdc4,color:#000
```

### Patient Grace Period Response

```mermaid
flowchart TD
    A[Patient logs in during grace period] --> B[GracePeriodBanner renders at top of page]
    B --> C{Patient choice}

    C -->|Keep My Account| D[patientChooseDeletionOutcome action: restore]
    C -->|Continue with Deletion| E[patientChooseDeletionOutcome action: confirm]

    D --> F[POST /api/user/restore-deletion]
    F --> G{Requester is scheduling clinician or ADMIN/DEVELOPER?}
    G -->|No| H[Return error]
    G -->|Yes| I[Update status to RESTORED, set restoredAt]
    I --> J[Create AuditLog: RESTORE_DELETION]
    J --> K[revalidatePath, page reloads]
    K --> L[Account fully restored, banner removed]

    E --> M[Set scheduledDeletionAt = now]
    M --> N[Triggers immediate anonymization on next cron run]
    N --> O[Patient redirected, account pending anonymization]

    style A fill:#3b82f6,color:#fff
    style B fill:#ff6b6b,color:#fff
    style D fill:#4ecdc4,color:#000
    style E fill:#ff6b6b,color:#fff
    style L fill:#4ecdc4,color:#000
    style O fill:#ff6b6b,color:#fff
```

### Automated Anonymization (Cron / CLI)

```mermaid
flowchart TD
    A[Cron job runs daily at midnight OR CLI script executed] --> B[POST /api/user/anonymize-scheduled]

    B --> C[Find all DeletionSchedule where status=SCHEDULED and scheduledDeletionAt <= now]
    C --> D{Any expired schedules?}

    D -->|No| E[Log: No expired schedules, exit]
    D -->|Yes| F[For each expired schedule, run anonymization]

    F --> G[Update User: clear PII fields, set email to deleted_X@anonymous.com]
    G --> H[Update Diagnoses: clear location data]
    H --> I[Delete all patient chats]
    I --> J[Update DeletionSchedule: status=ANONYMIZED, set anonymizedAt]
    J --> K[Create AuditLog: ANONYMIZE_ACCOUNT]
    K --> L[Log success, continue to next]

    L --> M{More schedules?}
    M -->|Yes| F
    M -->|No| N[Done, log summary]

    style A fill:#3b82f6,color:#fff
    style B fill:#ff6b6b,color:#fff
    style G fill:#ff6b6b,color:#fff
    style J fill:#4ecdc4,color:#000
    style N fill:#4ecdc4,color:#000
```

### Key Behaviors

| Scenario | Behavior |
|----------|----------|
| Patient submits symptoms during grace period | Allowed, banner shows on every page |
| Clinician who scheduled deletion is inactive | ADMIN or DEVELOPER can restore |
| GRACE_PERIOD_DAYS=0 | Immediate anonymization (demo mode) |
| Multiple schedules for same patient | Prevented by unique constraint on userId |
| Patient confirms deletion early | scheduledDeletionAt set to now, anonymizes on next cron run |

### Clinician UI Components

- **Users List Page**: "Pending Deletion" tab with badge count showing patients scheduled for deletion
- **User Detail Page**: Danger Zone card with delete modal (active patients) or warning alert with restore button (scheduled patients)
- **Patient Layout**: Grace period banner with "Keep My Account" and "Continue with Deletion" options
