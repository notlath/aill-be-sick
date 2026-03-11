# Patient Email Authentication

## Overview
- **Purpose**: Previously, patients could only authenticate using Google OAuth (Sign in with Google). This feature introduces an alternative, standard email and password authentication method for patients, providing them with more choices and alleviating the hard dependency on third-party OAuth providers.
- **Target Users**: Patients who prefer not to use Google accounts to log in, or patients who wish to use separate credentials explicitly for the AI'll Be Sick application.
- **Key Benefits**: 
  - Reduced friction for non-Google users.
  - Consistent UI/UX alignment with the Clinician login portal.
  - Isolated credentials ensuring a dedicated identity workflow.

## How It Works
- **Core Functionality**: 
  - Allows patients to input an email address and a password (minimum 6 characters) to create an account or log into an existing account.
  - Signup operations integrate directly with Supabase Auth to dispatch an email verification link out-of-the-box.
  - Immediate database synchronization creates the patient's `User` Prisma record (with the `PATIENT` role) upon successful signup to eliminate downstream profile sync errors.
- **User Flow**: 
  1. **Log in / Sign up**: The user navigates to `/login`. They fill the email and password form.
  2. **Sign Up action**: If they click "Create patient account", the `patientSignup` server action is invoked. A verification email is sent, an initial profile is saved to the database, and the user is redirected to the `/verify-email` holding page.
  3. **Verification**: The user clicks the link in their email which targets `/auth/callback`. The session is verified, the Prisma DB is upserted, and the Next.js target cache invalidation triggers.
  4. **Log in action**: If they click "Sign In", the `patientLogin` server action is invoked, the credentials are verified, the session cookies are set, and they are redirected to the homepage (`/diagnosis`).
- **System Integration**: 
  - Uses `next-safe-action` for end-to-end type-safe API mutation.
  - Hooks into the existing `@/utils/supabase/server` client and Prisma schemas.
  - Connects to the standard `/auth/callback/route.ts` used by the system for session instantiation.

## Implementation
- **Technical Requirements**: 
  - Next.js 14+ (App Router)
  - Supabase SSR `@supabase/ssr`
  - React Hook Form and Zod for schema validation
  - Prisma for `User` model synchronization.

- **Configuration**: 
  The feature reuses the existing `EmailAuthSchema`. No additional environment variables are needed beyond the standard `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

- **Code Examples**:
  The core creation and auth logic is encapsulated in `frontend/actions/patient-auth.ts`:
  ```typescript
  import { actionClient } from "./client";
  import { EmailAuthSchema } from "@/schemas/EmailAuthSchema";
  import { createClient } from "@/utils/supabase/server";

  export const patientSignup = actionClient
    .inputSchema(EmailAuthSchema)
    .action(async ({ parsedInput }) => {
      const { email, password } = parsedInput;
      const supabase = await createClient();

      // 1. Send the sign-up request to Supabase
      const { error, data } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        }
      });

      if (error) return { error: error.message };

      // 2. Immediately create the database record to prevent sync errors
      if (data.user) {
        const prisma = (await import("@/prisma/prisma")).default;
        await prisma.user.upsert({
          where: { email: data.user.email },
          create: {
            email: data.user.email!,
            name: data.user.user_metadata?.name || "",
            authId: data.user.id,
            role: "PATIENT", // Explicit enforcement of PATIENT role
          },
          update: {},
        });
      }

      return { success: true };
    });
  ```

## Reference
- **Parameters**: 
  - All form handling goes through `EmailAuthSchema` (email: valid email string; password: string >= 6 characters).
- **Error Handling**: 
  - Supabase standard auth errors are bubbled up to the client and displayed via `sonner` toasts (e.g. "User already registered", "Password should be at least 6 characters").
  - Account Synchronization Error (`/auth/sync-error`) mitigated by ensuring exact cache purging via `revalidateTag` in the OAuth/Verification callback.
- **Performance**: 
  - Server actions abstract the heavy HTTP lifting from the client.
  - Utilizing `react-hook-form` avoids full UI re-renders on keystrokes, enforcing strict validation pre-submit without latency.
