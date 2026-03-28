import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/prisma/prisma";
import { createClient } from "@/utils/supabase/server";

/**
 * Auth callback route
 * - Handles both OAuth callbacks and invite link callbacks
 * - OAuth: uses query parameter `code`
 * - Invite: uses hash fragment parameters `access_token`, `refresh_token`, `type=invite`
 * - Fetches the authenticated Supabase user
 * - Upserts the user into the application database via Prisma (sync by authId)
 * - Redirects back to the app (preserves `next` param if provided)
 *
 * CRITICAL: For invite links, Supabase sends tokens in the URL hash fragment
 * (e.g., #access_token=xxx&refresh_token=xxx&type=invite), NOT as query params.
 * These hash fragment params are:
 * - access_token: The access token to use for authenticated requests
 * - refresh_token: The refresh token for getting new access tokens
 * - expires_in: Token expiration time in seconds
 * - expires_at: Token expiration timestamp
 * - token_type: Usually "bearer"
 * - type: "invite" for invitation links
 *
 * Since hash fragments are NOT sent to the server, we need to:
 * 1. Return a page that extracts the hash fragment client-side
 * 2. Use the Supabase client to set the session from those tokens
 * 3. Then redirect to the destination
 *
 * For OAuth:
 * - Provider redirects to callback with `?code=xxx` query param
 * - Server exchanges code for session using PKCE
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin, hash } = new URL(request.url);

  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) next = "/";

  // Check if this is an invite flow by looking at hash fragment
  // Hash fragment is not sent to server, but we can check if there's no code
  // and the URL structure suggests it's an invite
  const hasHashFragment = hash && hash.length > 0;

  console.log(
    "[Auth Callback] Received request:",
    JSON.stringify({
      hasCode: !!code,
      hasHashFragment,
      next,
      error,
      url: request.url,
    }),
  );

  // Handle OAuth/invite errors from provider
  if (error) {
    console.error(
      "[Auth Callback] Provider error:",
      error,
      errorDescription || "",
    );
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || "")}`,
    );
  }

  // Handle OAuth flow (code in query params)
  if (code) {
    try {
      console.log("[Auth Callback] Handling OAuth flow with code...");
      const supabase = await createClient();

      // Exchange the OAuth code for a session
      const { error: exchangeError, data } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error(
          "[Auth Callback] Code exchange failed:",
          exchangeError.message,
          exchangeError,
        );
        return NextResponse.redirect(
          `${origin}/auth/auth-code-error?error=exchange_failed&message=${encodeURIComponent(exchangeError.message)}`,
        );
      }

      console.log("[Auth Callback] OAuth code exchange successful");

      // Get the user for the session
      const {
        data: { user },
        error: getUserError,
      } = await supabase.auth.getUser();

      if (getUserError) {
        console.error("[Auth Callback] Failed to fetch user:", getUserError);
      } else if (user && user.id) {
        console.log("[Auth Callback] User authenticated:", user.id);

        // Check if user exists in database
        const existingUser = await prisma.user.findUnique({
          where: { authId: user.id },
        });

        if (!existingUser) {
          console.log(
            "[Auth Callback] User not found in database, redirecting to need-account",
          );
          return NextResponse.redirect(`${origin}/need-account`);
        }

        // Update user data
        try {
          await prisma.user.update({
            where: { authId: user.id },
            data: {
              ...(user.email ? { email: user.email } : {}),
              ...(user.user_metadata?.avatar_url
                ? { avatar: user.user_metadata.avatar_url }
                : {}),
            },
          });

          const { revalidateTag } = require("next/cache");
          revalidateTag(`user-${user.id}`);
        } catch (prismaError) {
          console.error(
            "[Auth Callback] Error updating user with Prisma:",
            prismaError,
          );
        }
      }

      // Redirect after successful OAuth
      console.log("[Auth Callback] Redirecting to:", `${origin}${next}`);
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
      console.error("[Auth Callback] OAuth flow error:", err);
      return NextResponse.redirect(
        `${origin}/auth/auth-code-error?error=oauth_failed`,
      );
    }
  }

  // Handle Invite flow (tokens in hash fragment)
  // Since hash fragments are not sent to server, we need to return an HTML page
  // that extracts the tokens client-side and sets the session
  console.log(
    "[Auth Callback] No code found, likely invite flow with hash fragment tokens",
  );

  // Get Supabase config from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Auth Callback] Missing Supabase environment variables");
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=config_error`,
    );
  }

  // Return HTML that will extract hash fragment and set session client-side
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Completing Sign In...</title>
  <script>
    (async function() {
      try {
        // Extract tokens from hash fragment
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const expires_in = params.get('expires_in');
        const expires_at = params.get('expires_at');
        const token_type = params.get('token_type');
        const type = params.get('type');
        
        console.log('[Auth Callback Client] Hash params:', { 
          hasAccessToken: !!access_token, 
          hasRefreshToken: !!refresh_token,
          type,
          expires_in 
        });
        
        if (!access_token) {
          console.error('[Auth Callback Client] No access_token in hash');
          window.location.href = '${origin}/auth/auth-code-error?error=no_token';
          return;
        }
        
        // Check if it's an invite flow
        if (type === 'invite') {
          console.log('[Auth Callback Client] Invite flow detected');
        }
        
        // Import Supabase client dynamically
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        
        // Create Supabase client with the same config as the app
        const supabase = createClient(
          '${supabaseUrl}',
          '${supabaseAnonKey}',
          {
            auth: {
              autoRefreshToken: true,
              persistSession: true,
            }
          }
        );
        
        // Set the session
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token: refresh_token || '',
        });
        
        if (error) {
          console.error('[Auth Callback Client] Error setting session:', error);
          
          // Check if the error indicates an expired invite
          const errorMessage = error.message || '';
          const isExpiredInvite = 
            errorMessage.includes('expired') || 
            errorMessage.includes('Invalid token') ||
            errorMessage.includes('invalid') ||
            error.status === 401 ||
            error.code === 'otp_expired' ||
            error.code === 'session_expired';
          
          if (isExpiredInvite || errorMessage.toLowerCase().includes('expire')) {
            console.log('[Auth Callback Client] Invite token expired, redirecting to expired-invite page');
            window.location.href = '${origin}/auth/expired-invite';
          } else {
            window.location.href = '${origin}/auth/auth-code-error?error=session_error&message=' + encodeURIComponent(error.message);
          }
          return;
        }
        
        console.log('[Auth Callback Client] Session set successfully');
        
        // For invite flows, redirect to set-password page
        // The "/patient/set-password" path should trigger the next redirect
        const nextPath = '${next}';
        const redirectPath = nextPath.includes('set-password') ? nextPath : '/diagnosis';
        
        console.log('[Auth Callback Client] Redirecting to:', redirectPath);
        window.location.href = '${origin}' + redirectPath;
        
      } catch (err) {
        console.error('[Auth Callback Client] Unexpected error:', err);
        window.location.href = '${origin}/auth/auth-code-error?error=client_error';
      }
    })();
  </script>
</head>
<body>
  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif;">
    <div style="text-align: center; max-width: 400px; padding: 20px;">
      <h2 style="margin-bottom: 10px; color: #333;">Completing sign in...</h2>
      <p style="color: #666;">Please wait while we set up your account.</p>
      <div style="margin-top: 20px; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin-left: auto; margin-right: auto;"></div>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  </div>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
