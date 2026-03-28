import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/prisma/prisma";
import { createClient } from "@/utils/supabase/server";

/**
 * OAuth callback route
 * - Exchanges the provider code for a Supabase session (sets cookies)
 * - Fetches the authenticated Supabase user
 * - Upserts the user into the application database via Prisma (sync by authId)
 * - Redirects back to the app (preserves `next` param if provided)
 *
 * CRITICAL: This route must receive all cookies from the OAuth flow, including
 * the PKCE code_verifier cookie that Supabase sets during signInWithOAuth.
 * The cookies are automatically handled by Next.js and passed to the Supabase
 * server client via the createClient() function.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) next = "/";

  // Log incoming cookies for debugging
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  console.log(
    "[OAuth Callback] Incoming cookies:",
    allCookies.map((c) => c.name),
  );

  // Handle OAuth errors from provider
  if (error) {
    console.error(
      "[OAuth Callback] Provider error:",
      error,
      errorDescription || "",
    );
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || "")}`,
    );
  }

  if (!code) {
    console.error("[OAuth Callback] No authorization code received");
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=no_code`,
    );
  }

  try {
    const supabase = await createClient();

    console.log("[OAuth Callback] Attempting to exchange code for session...");

    // Exchange the OAuth code for a session
    // The Supabase Server Client will automatically retrieve the code_verifier
    // from the cookies that were set during the initial signInWithOAuth call
    const { error: exchangeError, data } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error(
        "[OAuth Callback] Code exchange failed:",
        exchangeError.message,
        exchangeError,
      );

      // More detailed error response
      return NextResponse.redirect(
        `${origin}/auth/auth-code-error?error=exchange_failed&message=${encodeURIComponent(exchangeError.message)}`,
      );
    }

    console.log("[OAuth Callback] Code exchange successful");

    try {
      // Get the user for the newly created session
      const {
        data: { user },
        error: getUserError,
      } = await supabase.auth.getUser();

      if (getUserError) {
        console.error(
          "[OAuth Callback] Failed to fetch user after exchange:",
          getUserError,
        );
        // Continue anyway - the session is set, just user data might be stale
      }

      if (user && user.id) {
        console.log("[OAuth Callback] User authenticated:", user.id);

        // Check if user exists in database - only pre-registered patients can sign in
        const existingUser = await prisma.user.findUnique({
          where: { authId: user.id },
        });

        if (!existingUser) {
          // User not pre-registered by clinician - block access
          console.log(
            "[OAuth Callback] User not found in database, redirecting to need-account",
          );
          return NextResponse.redirect(`${origin}/need-account`);
        }

        // User exists - update only email and avatar, preserve clinician-entered name
        const upsertData = {
          authId: user.id,
          email: user.email ?? undefined,
          avatar: user.user_metadata?.avatar_url ?? undefined,
        };

        try {
          await prisma.user.update({
            where: { authId: user.id },
            data: {
              ...(upsertData.email ? { email: upsertData.email } : {}),
              ...(upsertData.avatar ? { avatar: upsertData.avatar } : {}),
              // Do NOT update name - preserve clinician-entered name
            },
          });

          console.log("[OAuth Callback] User updated in database");

          const { revalidateTag } = require("next/cache");
          revalidateTag(`user-${user.id}`);
        } catch (prismaError) {
          console.error(
            "[OAuth Callback] Error updating user with Prisma:",
            prismaError,
          );
          // Don't block redirect - auth session is more important
        }
      }
    } catch (err) {
      console.error(
        "[OAuth Callback] Unexpected error during user setup:",
        err,
      );
      // Continue - user setup is not critical
    }

    // Redirect back to the app
    console.log("[OAuth Callback] Redirecting to:", `${origin}${next}`);
    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocalEnv = process.env.NODE_ENV === "development";

    if (isLocalEnv) {
      return NextResponse.redirect(`${origin}${next}`);
    } else if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${next}`);
    } else {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } catch (err) {
    console.error("[OAuth Callback] Unexpected error in callback route:", err);
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=internal`,
    );
  }
}
