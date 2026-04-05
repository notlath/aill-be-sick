import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth callback route for invite, recovery, and Google OAuth flows
 * - Handles invite tokens (token + type in query params) with verifyOtp
 * - Handles recovery codes (code + type=recovery) with exchangeCodeForSession
 * - Handles Google OAuth (code without type) with pre-registration check
 * - Returns HTML that processes auth client-side and redirects
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  let next = searchParams.get("next") ?? "/patient/set-password";
  if (!next.startsWith("/")) next = "/";

  console.log(
    "[Auth Callback] Received request:",
    JSON.stringify({
      hasCode: !!code,
      hasTokenHash: !!token_hash,
      type,
      next,
      error,
    }),
  );

  // Handle errors from provider
  if (error) {
    console.error("[Auth Callback] Provider error:", error, errorDescription);
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || "")}`,
    );
  }

  // Get Supabase config from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Auth Callback] Missing Supabase environment variables");
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=config_error`,
    );
  }

  // Determine auth method and handle server-side verification
  let authMethod = "";
  let useServerSideVerify = false;

  if (token_hash && type) {
    // Invite flow - verify on server with verifyOtp
    authMethod = "verifyOtp";
    useServerSideVerify = true;
    console.log(
      "[Auth Callback] Using server-side verifyOtp for invite token_hash",
    );
  } else if (code && type === "recovery") {
    // Recovery flow - use exchangeCodeForSession
    authMethod = "exchangeCodeForSession";
    useServerSideVerify = true;
    console.log(
      "[Auth Callback] Using server-side exchangeCodeForSession for recovery code",
    );
  } else if (code) {
    // Google OAuth flow - use exchangeCodeForSession with pre-registration check
    authMethod = "googleOAuth";
    useServerSideVerify = true;
    console.log(
      "[Auth Callback] Using server-side exchangeCodeForSession for Google OAuth",
    );
  } else {
    console.error("[Auth Callback] No valid auth parameters found");
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=no_auth_params`,
    );
  }

  // Server-side auth verification
  if (useServerSideVerify) {
    const { createServerClient } = await import("@supabase/ssr");
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(
            cookiesToSet: {
              name: string;
              value: string;
              options?: Record<string, unknown>;
            }[],
          ) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    let error = null;

    if (token_hash && type) {
      // Invite flow - use verifyOtp - type should be "invite" which is an EmailOtpType
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as "invite" | "signup" | "email" | "recovery",
      });
      error = verifyError;
    } else if (code && type === "recovery") {
      // Recovery flow - use exchangeCodeForSession
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      error = exchangeError;
    } else if (code) {
      // Google OAuth flow - use exchangeCodeForSession with pre-registration check
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      error = exchangeError;

      if (!error) {
        // Pre-registration check: only allow Google sign-in for users already in database
        const { data: { user } } = await supabase.auth.getUser();

        if (user && user.id) {
          // Import Prisma client dynamically to avoid edge runtime issues
          const { default: prisma } = await import("@/prisma/prisma");
          const { revalidateTag } = await import("next/cache");

          const existingUser = await prisma.user.findUnique({
            where: { authId: user.id },
          });

          if (!existingUser) {
            // User not pre-registered by clinician - block access
            console.log(
              "[Auth Callback] Google user not pre-registered, redirecting to /need-account",
            );
            return NextResponse.redirect(`${origin}/need-account`);
          }

          // User exists - update only avatar, preserve clinician-entered name and email
          await prisma.user.update({
            where: { authId: user.id },
            data: {
              ...(user.user_metadata?.avatar_url ? { avatar: user.user_metadata.avatar_url } : {}),
            },
          });

          revalidateTag(`user-${user.id}`, { expire: 0 });
        }

        // Redirect to home (role-based middleware handles from there)
        console.log("[Auth Callback] Google OAuth SUCCESS! Redirecting to /");
        return NextResponse.redirect(`${origin}/`);
      }
    }

    if (error) {
      console.error("[Auth Callback] SUPABASE AUTH ERROR:", error.message);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`,
      );
    }

    console.log("[Auth Callback] SUCCESS! Redirecting to:", next);
    return NextResponse.redirect(`${origin}${next}`);
  }
}
