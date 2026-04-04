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
