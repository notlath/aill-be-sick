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
