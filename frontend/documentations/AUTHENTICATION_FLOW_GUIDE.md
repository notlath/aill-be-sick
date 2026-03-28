# Authentication Flow Guide

## Overview

This document provides a comprehensive guide to the authentication system in the AI'll Be Sick application. The application uses **Supabase Authentication** with support for both **OAuth 2.0 (Google)** and **email/password** authentication, integrated with a **Next.js 14+ App Router** frontend and a **PostgreSQL** database managed via **Prisma ORM**.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication Providers](#authentication-providers)
3. [User Roles](#user-roles)
4. [Authentication Flow Diagrams](#authentication-flow-diagrams)
   - [OAuth (Google) Login Flow](#oauth-google-login-flow)
   - [Email/Password Login Flow](#emailpassword-login-flow)
   - [Email/Password Registration Flow](#emailpassword-registration-flow)
   - [Password Reset Flow](#password-reset-flow)
   - [Logout Flow](#logout-flow)
5. [Technical Implementation Details](#technical-implementation-details)
   - [Frontend Authentication Utilities](#frontend-authentication-utilities)
   - [Backend Database Schema](#backend-database-schema)
   - [Session Management](#session-management)
   - [Route Protection](#route-protection)
6. [Step-by-Step User Journeys](#step-by-step-user-journeys)
   - [Patient Login Journey](#patient-login-journey)
   - [Clinician Login Journey](#clinician-login-journey)
7. [Error Handling](#error-handling)
8. [Security Considerations](#security-considerations)
9. [Environment Configuration](#environment-configuration)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUTHENTICATION ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐        │
│  │   Patient    │         │  Clinician   │         │   Developer  │        │
│  │   (OAuth)    │         │ (Email/Pass) │         │ (Email/Pass) │        │
│  └──────┬───────┘         └──────┬───────┘         └──────┬───────┘        │
│         │                        │                        │                 │
│         └────────────────────────┼────────────────────────┘                 │
│                                  │                                           │
│                          ┌───────▼────────┐                                 │
│                          │  Next.js App   │                                 │
│                          │  (Frontend)    │                                 │
│                          └───────┬────────┘                                 │
│                                  │                                           │
│              ┌───────────────────┼───────────────────┐                      │
│              │                   │                   │                       │
│     ┌────────▼────────┐  ┌──────▼──────┐   ┌───────▼────────┐              │
│     │  Supabase Auth  │  │   Prisma    │   │  PostgreSQL    │              │
│     │  (OAuth/Email)  │  │    ORM      │   │   Database     │              │
│     └─────────────────┘  └─────────────┘   └────────────────┘              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component                   | Technology               | Purpose                                       |
| --------------------------- | ------------------------ | --------------------------------------------- |
| **Frontend Framework**      | Next.js 14+ (App Router) | Server-side rendering, API routes, middleware |
| **Authentication Provider** | Supabase Auth            | OAuth 2.0, email/password, session management |
| **ORM**                     | Prisma                   | Type-safe database access                     |
| **Database**                | PostgreSQL               | User data, diagnoses, chat history            |
| **Backend API**             | Flask (Python)           | ML diagnosis, clustering, surveillance        |

---

## Authentication Providers

### 1. OAuth 2.0 (Google) - Patient Login

Patients authenticate exclusively through Google OAuth 2.0 with PKCE (Proof Key for Code Exchange).

**Configuration Location:** Supabase Dashboard → Authentication → Providers → Google

**Required Google OAuth Scopes:**

- `openid` - OpenID Connect basic profile
- `profile` - User profile information
- `email` - User email address

### 2. Email/Password - Clinician & Developer Login

Clinicians and Developers use traditional email/password authentication managed by Supabase Auth.

**Password Requirements:**

- Minimum 6 characters
- Stored securely by Supabase (bcrypt hashing)

---

## User Roles

The application defines three distinct user roles stored in the `User` database table:

| Role        | Authentication Method | Landing Page | Access Level                                                    |
| ----------- | --------------------- | ------------ | --------------------------------------------------------------- |
| `PATIENT`   | Google OAuth only     | `/diagnosis` | Patient portal - symptom checker, diagnosis history, profile    |
| `CLINICIAN` | Email/Password        | `/dashboard` | Clinician portal - patient analytics, reports, alerts, map view |
| `DEVELOPER` | Email/Password        | `/diagnosis` | Full access - patient view + developer tools                    |

**Database Schema (Prisma):**

```prisma
enum Role {
  PATIENT
  CLINICIAN
  DEVELOPER
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  authId    String?  @unique  // Supabase Auth user ID
  avatar    String?
  role      Role     @default(PATIENT)
  // ... additional fields
}
```

---

## Authentication Flow Diagrams

### OAuth (Google) Login Flow

```
┌──────────┐                              ┌──────────┐
│  Patient │                              │  Next.js │
└────┬─────┘                              └────┬─────┘
     │                                         │
     │  1. Click "Sign in with Google"         │
     ├────────────────────────────────────────>│
     │                                         │
     │                                         │ 2. Call supabase.auth.signInWithOAuth()
     │                                         │    - provider: "google"
     │                                         │    - redirectTo: /auth/callback
     │                                         │
     │                                         │ 3. Redirect to Google OAuth consent
     │<────────────────────────────────────────┤
     │                                         │
     │  4. User authenticates with Google      │
     ├─────────────────────────────────────────┤
     │                                         │
     │  5. Google redirects with auth code     │
     ├────────────────────────────────────────>│
     │                                         │    Route: /auth/callback?code=AUTH_CODE
     │                                         │
     │                                         │ 6. Exchange code for session
     │                                         │    supabase.auth.exchangeCodeForSession()
     │                                         │    - Auto-retrieves PKCE code_verifier
     │                                         │
     │                                         │ 7. Fetch user data
     │                                         │    supabase.auth.getUser()
     │                                         │
     │                                         │ 8. Upsert user to database
     │                                         │    Prisma: user.upsert()
     │                                         │    - Match by authId
     │                                         │
      │  9. Redirect to / (Root)                 │
      │<────────────────────────────────────────┤
      │                                         │
      │  10. Root redirects to /diagnosis       │
      │<────────────────────────────────────────┤
      │                                         │
      ▼                                         ▼
   Authenticated                              Session
   in Patient                                 Cookies Set
   Portal

### Email/Password Login Flow

```

### Email/Password Login Flow

```
┌────────────┐                              ┌──────────┐
│ Clinician  │                              │  Next.js │
└─────┬──────┘                              └────┬─────┘
      │                                          │
      │  1. Enter email/password                 │
      │     Submit form                          │
      ├─────────────────────────────────────────>│
      │                                          │
      │                                          │ 2. Call emailLogin action
      │                                          │    (Server Action)
      │                                          │
      │                                          │ 3. supabase.auth.signInWithPassword()
      │                                          │    - email
      │                                          │    - password
      │                                          │
      │                                          │ 4. Validate credentials
      │                                          │    Supabase Auth verifies
      │                                          │
      │  5. Redirect to /dashboard               │
      │<─────────────────────────────────────────┤
      │                                          │
      ▼                                          ▼
   Authenticated                              Session
   in Clinician                               Cookies Set
   Portal
```

### Email/Password Registration Flow

```
┌────────────┐                              ┌──────────┐
│ Clinician  │                              │  Next.js │
└─────┬──────┘                              └────┬─────┘
      │                                          │
      │  1. Enter email/password                 │
      │     Click "Create account"               │
      ├─────────────────────────────────────────>│
      │                                          │
      │                                          │ 2. Call emailSignup action
      │                                          │    (Server Action)
      │                                          │
      │                                          │ 3. supabase.auth.signUp()
      │                                          │    - Creates user in Supabase Auth
      │                                          │
      │                                          │ 4. Create user in database
      │                                          │    Prisma: user.upsert()
      │                                          │    - role: CLINICIAN
      │                                          │
      │  5. Show success toast                   │
      │<─────────────────────────────────────────┤
      │     "Check email to confirm"             │
      │                                          │
      ▼                                          ▼
   Pending                                    User created
   Confirmation                               in both systems
```

### Password Reset Flow

```
┌────────────┐                              ┌──────────┐         ┌────────────┐
│ Clinician  │                              │  Next.js │         │  Supabase  │
└─────┬──────┘                              └────┬─────┘         └─────┬──────┘
      │                                          │                     │
      │  1. Enter email                          │                     │
      │     Submit reset request                 │                     │
      ├─────────────────────────────────────────>│                     │
      │                                          │                     │
      │                                          │ 2. requestPasswordReset()
      │                                          │     action
      │                                          │                     │
      │                                          │ 3. resetPasswordForEmail()
      │                                          ├────────────────────>│
      │                                          │                     │
      │                                          │                     │ 4. Send reset email
      │                                          │                     │    with OTP link
      │                                          │<────────────────────┤
      │                                          │                     │
      │  5. Receive email with reset link        │                     │
      │<────────────────────────────────────────────────────────────────┤
      │                                          │                     │
      │  6. Click reset link                     │                     │
      ├─────────────────────────────────────────>│                     │
      │                                          │    /auth/confirm?token_hash=XXX&type=recovery
      │                                          │                     │
      │                                          │ 7. verifyOtp()      │
      │                                          ├────────────────────>│
      │                                          │                     │
      │                                          │ 8. Session created  │
      │                                          │<────────────────────┤
      │                                          │                     │
      │  9. Redirect to reset password page      │                     │
      │<─────────────────────────────────────────┤                     │
      │                                          │                     │
      │  10. Enter new password                  │                     │
      │      Submit                              │                     │
      ├─────────────────────────────────────────>│                     │
      │                                          │                     │
      │                                          │ 11. updateUser()    │
      │                                          │     { password }    │
      │                                          ├────────────────────>│
      │                                          │                     │
      │  12. Redirect to login                   │                     │
      │<─────────────────────────────────────────┤                     │
      │                                          │                     │
      ▼                                          ▼                     ▼
   Password                                   Updated
   Reset                                      Session
   Complete
```

### Logout Flow

```
┌──────────┐                              ┌──────────┐
│   User   │                              │  Next.js │
└────┬─────┘                              └────┬─────┘
     │                                         │
     │  1. Click "Sign out"                    │
     ├────────────────────────────────────────>│
     │                                         │
     │                                         │ 2. Call signOut action
     │                                         │    (Server Action)
     │                                         │
     │                                         │ 3. supabase.auth.signOut()
     │                                         │    - Clear session
     │                                         │
     │                                         │ 4. revalidatePath("/")
     │                                         │    - Clear Next.js cache
     │                                         │
     │  5. Redirect to /login                  │
     │<────────────────────────────────────────┤
     │                                         │
     ▼                                         ▼
  Logged Out                               Session
                                           Destroyed
```

---

## Technical Implementation Details

### Frontend Authentication Utilities

#### Supabase Client Configuration

**Browser Client** (`/frontend/utils/supabase/client.ts`):

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

**Server Client** (`/frontend/utils/supabase/server.ts`):

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}
```

#### Key Authentication Functions

**1. Get Authenticated User** (`/frontend/utils/user.ts`):

```typescript
export const getAuthUser = async () => {
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  return user.data.user;
};
```

**2. Get Current Database User** (`/frontend/utils/user.ts`):

```typescript
export const getCurrentDbUser = async () => {
  await connection();
  const authUser = await getAuthUser();

  if (!authUser) {
    return { error: "No authenticated user found", code: "NOT_AUTHENTICATED" };
  }

  try {
    const dbUser = await getDbUserByAuthId(authUser.id);

    if (!dbUser) {
      return { error: "No user found in the database", code: "USER_NOT_FOUND" };
    }

    return { success: dbUser };
  } catch (error) {
    console.error(`Error fetching user from database: ${error}`);
    return {
      error: `Error fetching user from database: ${error}`,
      code: "DB_ERROR",
    };
  }
};
```

**3. Sign Out** (`/frontend/utils/auth.ts`):

```typescript
export const signOut = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
};
```

#### Server Actions for Email Authentication

**Email Login** (`/frontend/actions/email-auth.ts`):

```typescript
export const emailLogin = actionClient
  .inputSchema(EmailAuthSchema)
  .action(async ({ parsedInput }) => {
    const { email, password } = parsedInput;
    const supabase = await createClient();

    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(`Error logging in with email: ${error.message}`);
      return { error: `Error logging in with email: ${error.message}` };
    }

    revalidatePath("/", "layout");
    redirect("/");
  });
```

**Email Signup** (`/frontend/actions/email-auth.ts`):

```typescript
export const emailSignup = actionClient
  .inputSchema(EmailAuthSchema)
  .action(async ({ parsedInput }) => {
    const { email, password } = parsedInput;
    const supabase = await createClient();

    const { error, data } = await supabase.auth.signUp({ email, password });

    if (error) {
      console.error(`Error signing up with email: ${error.message}`);
      return { error: `Error signing up with email: ${error.message}` };
    }

    if (data.user) {
      await prisma.user.upsert({
        where: { email: data.user.email },
        create: {
          email: data.user.email!,
          name: data.user.user_metadata!.name || "",
          authId: data.user.id,
          role: "CLINICIAN",
        },
        update: {},
      });
    }

    revalidatePath("/", "layout");
  });
```

**Password Reset Request** (`/frontend/actions/email-auth.ts`):

```typescript
export const requestPasswordReset = actionClient
  .inputSchema(z.object({ email: z.string().email() }))
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;
    const supabase = await createClient();

    const appUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_VERCEL_URL ??
      "http://localhost:3000";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/clinician-reset-password`,
    });

    if (error) {
      console.error(`Error requesting password reset: ${error.message}`);
      return { error: `Error requesting password reset: ${error.message}` };
    }

    return { success: true };
  });
```

### Backend Database Schema

#### User Model

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  authId    String?  @unique  // Links to Supabase Auth user ID
  avatar    String?
  role      Role     @default(PATIENT)
  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt

  // Location data for epidemiological tracking
  city      String?
  latitude  Float?
  longitude Float?
  region    String?
  province  String?
  barangay  String?

  // Demographics
  age       Int?
  gender    Gender?
  birthday  DateTime?

  // Relations
  chats     Chat[]
  diagnoses Diagnosis[]
}
```

#### Role Enum

```prisma
enum Role {
  PATIENT
  CLINICIAN
  DEVELOPER
}
```

### Session Management

#### Cookie-Based Sessions

Supabase SSR manages sessions through HTTP-only cookies:

| Cookie Name                          | Purpose       | HttpOnly | Secure |
| ------------------------------------ | ------------- | -------- | ------ |
| `sb-<project_id>-auth-token`         | Session token | Yes      | Yes    |
| `sb-<project_id>-auth-token-refresh` | Refresh token | Yes      | Yes    |

#### Session Lifecycle

1. **Creation:** When user authenticates, Supabase sets session cookies
2. **Persistence:** Cookies are automatically sent with every request
3. **Refresh:** Access tokens are refreshed automatically by Supabase client
4. **Termination:** `signOut()` clears all auth cookies

#### PKCE (Proof Key for Code Exchange)

For OAuth flows, PKCE provides additional security:

```typescript
// PKCE Challenge Generation (/frontend/utils/supabase/auth-helpers.ts)
export async function generatePKCEChallenge(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const codeVerifier = generateRandomString(128);
  const codeVerifierHash = await sha256(codeVerifier);
  const codeChallenge = base64UrlEncode(codeVerifierHash);

  return {
    codeVerifier,
    codeChallenge,
  };
}
```

**PKCE Flow:**

1. Client generates random `code_verifier`
2. Client creates `code_challenge` = SHA256(code_verifier)
3. OAuth request includes `code_challenge`
4. Provider returns authorization code
5. Client exchanges code + `code_verifier` for tokens
6. Provider verifies `code_challenge` matches `code_verifier`

### Route Protection

#### Middleware Pattern

While the current implementation uses inline route protection, the pattern follows:

```typescript
// Conceptual middleware pattern
if (!user && !isAuthRoute) {
  redirect("/login");
}
```

#### Protected Routes

| Route Pattern           | Required Role        | Protection Method                            |
| ----------------------- | -------------------- | -------------------------------------------- |
| `/diagnosis/*`          | PATIENT, DEVELOPER   | Layout component checks `getCurrentDbUser()` |
| `/dashboard/*`          | CLINICIAN, DEVELOPER | Layout component checks `getCurrentDbUser()` |
| `/profile/*`            | All authenticated    | Layout component checks `getCurrentDbUser()` |
| `/users/*`              | CLINICIAN, DEVELOPER | Layout component checks `getCurrentDbUser()` |
| `/healthcare-reports/*` | CLINICIAN, DEVELOPER | Layout component checks `getCurrentDbUser()` |
| `/map/*`                | CLINICIAN, DEVELOPER | Layout component checks `getCurrentDbUser()` |
| `/alerts/*`             | CLINICIAN, DEVELOPER | Layout component checks `getCurrentDbUser()` |

#### Root Route Handler (`/frontend/app/page.tsx`)

```typescript
const HomeContent = async () => {
  const { success: dbUser, error, code } = await getCurrentDbUser();

  if (error) {
    if (code === "NOT_AUTHENTICATED") {
      redirect("/login");
    }
    if (code === "USER_NOT_FOUND") {
      redirect("/auth/sync-error");
    }
    return <div>Error: {JSON.stringify(error)}</div>;
  }

  if (!dbUser) {
    redirect("/login");
  }

  // Role-based routing
  if (dbUser.role === "CLINICIAN") {
    redirect("/dashboard");
  }

  if (dbUser.role === "PATIENT") {
    redirect("/diagnosis");
  }

  if (dbUser.role === ("DEVELOPER" as any)) {
    redirect("/diagnosis");
  }

  return null;
};
```

---

## Step-by-Step User Journeys

### Patient Login Journey

#### Scenario: First-time patient user

**Step 1: Landing on Login Page**

- User navigates to `http://localhost:3000/login`
- Sees "AI'll Be Sick" branding with "Sign in with Google" button
- Option to switch to clinician login

**Step 2: Initiating OAuth**

- User clicks "Sign in with Google"
- Frontend calls `supabase.auth.signInWithOAuth({ provider: "google", redirectTo: "/auth/callback" })`
- Browser redirects to Google OAuth consent screen

**Step 3: Google Authentication**

- User selects Google account
- Grants permissions (email, profile)
- Google redirects back to `/auth/callback?code=AUTH_CODE`

**Step 4: Callback Processing**

- `/auth/callback` route receives authorization code
- Calls `supabase.auth.exchangeCodeForSession(code)`
- Supabase validates PKCE code verifier
- Session cookies are set
- Calls `supabase.auth.getUser()` to get user details

**Step 5: Database Synchronization**

- Prisma upserts user to `User` table:
  ```typescript
  await prisma.user.upsert({
    where: { authId: user.id },
    create: {
      authId: user.id,
      email: user.email,
      name: user.user_metadata?.full_name,
      role: "PATIENT", // Default
    },
    update: {
      email: user.email,
      name: user.user_metadata?.full_name,
    },
  });
  ```

**Step 6: Redirect to Patient Portal**

- User redirected to root `/`
- Root page checks role, redirects to `/diagnosis`
- Patient can now use symptom checker

#### Scenario: Returning patient user

**Steps 1-3:** Skipped (already has Google session)

**Step 4: Session Validation**

- Existing session cookies are valid
- `supabase.auth.getUser()` returns user immediately
- No OAuth flow needed

**Step 5:** Database sync still occurs (updates email/name if changed)

**Step 6:** Redirect to `/diagnosis`

---

### Clinician Login Journey

#### Scenario: First-time clinician registration

**Step 1: Navigate to Clinician Login**

- User clicks "here" link on patient login page
- Redirected to `/clinician-login`
- Sees clinician-specific branding

**Step 2: Registration Form**

- Enters email (e.g., `doctor@hospital.com`)
- Enters password (min 6 characters)
- Clicks "Create clinician account"

**Step 3: Account Creation**

- Frontend calls `emailSignup` Server Action
- Supabase creates user in Auth system
- Prisma creates user in database with `role: "CLINICIAN"`
- Success toast: "Check your email to confirm your account"

**Step 4: Email Confirmation**

- User receives confirmation email from Supabase
- Clicks confirmation link
- `/auth/confirm` route verifies OTP
- Account is activated

**Step 5: First Login**

- Returns to `/clinician-login`
- Enters credentials
- Calls `emailLogin` Server Action
- `supabase.auth.signInWithPassword()` validates
- Session cookies set
- Redirected to `/dashboard`

#### Scenario: Returning clinician login

**Step 1:** Navigate to `/clinician-login`

**Step 2:** Enter credentials

**Step 3:** Submit form → `emailLogin` action

**Step 4:** Session created

**Step 5:** Redirect to `/dashboard`

---

## Error Handling

### Authentication Error Codes

| Error Code          | Description                          | User Action                    |
| ------------------- | ------------------------------------ | ------------------------------ |
| `NOT_AUTHENTICATED` | No valid Supabase session            | Redirect to `/login`           |
| `USER_NOT_FOUND`    | User in Supabase but not in database | Redirect to `/auth/sync-error` |
| `DB_ERROR`          | Database connection failure          | Display error message          |

### OAuth Error Handling

**Error Page:** `/auth/auth-code-error`

**Common OAuth Errors:**

| Error               | Cause                                   | Resolution            |
| ------------------- | --------------------------------------- | --------------------- |
| `no_code`           | Google didn't return authorization code | Retry sign-in         |
| `exchange_failed`   | PKCE code verifier mismatch             | Clear cookies, retry  |
| `validation_failed` | Both auth code and code verifier empty  | Clear browser storage |
| `internal`          | Server-side error                       | Contact support       |

**Error Page Component:**

```typescript
// /frontend/app/auth/auth-code-error/page.tsx
const errorMessages: Record<string, { title: string; description: string }> = {
  no_code: {
    title: "No Authorization Code",
    description:
      "The OAuth provider did not return an authorization code. Please try signing in again.",
  },
  exchange_failed: {
    title: "Code Exchange Failed",
    description: "Failed to exchange the authorization code for a session.",
  },
  validation_failed: {
    title: "Validation Failed",
    description:
      "The OAuth flow validation failed. Try clearing your browser cookies.",
  },
  internal: {
    title: "Internal Server Error",
    description: "An unexpected error occurred. Please try again.",
  },
};
```

### Email Authentication Errors

| Error Scenario           | Error Message                              | Handling              |
| ------------------------ | ------------------------------------------ | --------------------- |
| Invalid credentials      | "Invalid login credentials"                | Display toast error   |
| Unconfirmed email        | "Email not confirmed"                      | Prompt to check email |
| Weak password            | "Password should be at least 6 characters" | Form validation       |
| Email already registered | "User already registered"                  | Suggest login         |

---

## Security Considerations

### 1. PKCE for OAuth

All OAuth flows use PKCE (Proof Key for Code Exchange) to prevent authorization code interception attacks.

### 2. HTTP-Only Cookies

Session tokens are stored in HTTP-only, Secure cookies:

- Not accessible via JavaScript (XSS protection)
- Only sent over HTTPS in production

### 3. Role-Based Access Control (RBAC)

```typescript
// Example: Checking role before accessing clinician features
const { success: dbUser } = await getCurrentDbUser();

if (dbUser.role !== "CLINICIAN" && dbUser.role !== "DEVELOPER") {
  redirect("/unauthorized");
}
```

### 4. Database Isolation

- Supabase Auth stores credentials
- Application database (PostgreSQL via Prisma) stores user data
- Linked by `authId` (Supabase user ID)

### 5. Password Security

- Passwords never touch application servers
- Supabase handles bcrypt hashing
- Minimum 6 characters enforced

### 6. Session Expiration

- Access tokens: Short-lived (default 1 hour)
- Refresh tokens: Long-lived (configurable)
- Automatic token refresh by Supabase client

---

## Environment Configuration

### Required Environment Variables

**File:** `/frontend/.env.local`

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_VERCEL_URL=your-app.vercel.app  # Production

# Database (for Prisma)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Optional: Site URL for password reset
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### Supabase OAuth Configuration

**Google OAuth Provider Setup:**

1. **Google Cloud Console:**
   - Create OAuth 2.0 credentials
   - Authorized redirect URIs:
     - `https://your-project.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (development)

2. **Supabase Dashboard:**
   - Navigate to: Authentication → Providers → Google
   - Enable Google provider
   - Add Client ID and Client Secret from Google
   - Set redirect URL: `http://localhost:3000/auth/callback`

---

## Troubleshooting

### Common Issues

#### 1. "Both auth code and code verifier should be non-empty"

**Cause:** PKCE code verifier not found in cookies

**Solutions:**

- Verify redirect URL in Supabase matches exactly: `http://localhost:3000/auth/callback`
- Clear browser cookies and cache
- Restart development server
- Check `.env.local` has correct Supabase credentials

#### 2. "User not found in database"

**Cause:** User created in Supabase Auth but not synced to database

**Solutions:**

- Check `DATABASE_URL` is correct
- Verify Prisma schema is migrated
- Check `/auth/callback` route logs for Prisma errors

#### 3. Infinite redirect loop

**Cause:** Middleware/route protection misconfiguration

**Solutions:**

- Ensure `/login`, `/auth/*`, `/error` are excluded from protection
- Check `getCurrentDbUser()` is not throwing unhandled errors

#### 4. Clinician can't access patient features

**Cause:** Role-based routing

**Solution:**

- Clinicians are redirected to `/dashboard` by default
- Developers can access both by switching view mode

### Debug Logging

**Enable detailed OAuth logging:**

Check server logs for:

```
[OAuth Callback] Incoming cookies: [...]
[OAuth Callback] Attempting to exchange code for session...
[OAuth Callback] Code exchange successful
[OAuth Callback] User authenticated: user_id_here
[OAuth Callback] User upserted to database
```

**Browser DevTools:**

1. **Application → Cookies:** Verify `sb-<project_id>-auth-token` exists
2. **Console:** Check for Supabase client errors
3. **Network:** Inspect `/auth/callback` response

### Testing Authentication

**Manual OAuth Test:**

```bash
# 1. Get authorization URL
curl "https://your-project.supabase.co/auth/v1/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost:3000/auth/callback&scope=openid+profile+email"

# 2. After Google redirect, extract code from callback URL
# 3. Exchange code for session
curl -X POST "https://your-project.supabase.co/auth/v1/token?grant_type=authorization_code&code=CODE_HERE&client_id=YOUR_CLIENT_ID"
```

---

## Related Documentation

- [OAuth PKCE Fix Guide](./OAUTH_PKCE_FIX.md) - Detailed PKCE troubleshooting
- [Developer Role Setup](./DEVELOPER_ROLE.md) - Setting up developer accounts
- [Location Tracking](./LOCATION_TRACKING.md) - Patient location data handling

---

## Summary

The AI'll Be Sick authentication system provides:

- **Dual authentication methods:** OAuth for patients, email/password for clinicians
- **Role-based access control:** Three distinct user roles with different permissions
- **Secure session management:** HTTP-only cookies with PKCE for OAuth
- **Database synchronization:** Automatic user sync between Supabase Auth and PostgreSQL
- **Comprehensive error handling:** User-friendly error pages with technical details

**Key Files:**

| File                                            | Purpose                      |
| ----------------------------------------------- | ---------------------------- |
| `/frontend/app/(auth)/login/page.tsx`           | Patient OAuth login          |
| `/frontend/app/(auth)/clinician-login/page.tsx` | Clinician email login        |
| `/frontend/app/auth/callback/route.ts`          | OAuth callback handler       |
| `/frontend/app/auth/confirm/route.ts`           | Email confirmation handler   |
| `/frontend/actions/email-auth.ts`               | Email authentication actions |
| `/frontend/utils/auth.ts`                       | Sign out utility             |
| `/frontend/utils/user.ts`                       | User retrieval utilities     |
| `/frontend/utils/supabase/server.ts`            | Server-side Supabase client  |
| `/frontend/utils/supabase/client.ts`            | Browser Supabase client      |
| `/frontend/prisma/schema.prisma`                | Database schema              |

---

_Last Updated: March 1, 2026_
