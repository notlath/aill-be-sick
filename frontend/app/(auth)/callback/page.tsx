"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getDefaultLandingPath } from "@/constants/default-landing-path";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  KeyRound,
} from "lucide-react";
import Link from "next/link";

/**
 * Auth Callback Page
 *
 * This route only handles Supabase Email/OTP flows (email magic links, password resets, email verification).
 * Google Sign-In and other OAuth providers bypass this page entirely.
 *
 * Error handling uses query parameters for debugging:
 * - ?error=expired_link - Token has expired
 * - ?error=invalid_token - Token is invalid or malformed
 * - ?error=no_auth_params - Missing required authentication parameters
 * - ?error=session_expired - Session expired before verification completed
 */
const AuthCallbackPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "already_logged_in"
  >("loading");
  const [errorType, setErrorType] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // Check for explicit error query params first (Rank 1: Detailed Error Query)
      const queryError = searchParams.get("error");
      if (queryError) {
        setErrorType(queryError);
        setStatus("error");

        // Provide specific messages based on error type
        const errorMessages: Record<string, string> = {
          expired_link:
            "This link has expired. Please request a new one from the login page.",
          invalid_token:
            "This link is invalid or malformed. Please request a new one.",
          no_auth_params:
            "Missing authentication parameters. Please try logging in again.",
          session_expired:
            "Your session expired before verification completed. Please try again.",
        };

        setErrorMessage(
          errorMessages[queryError] ||
            "An authentication error occurred. Please try again.",
        );
        return;
      }

      try {
        const supabase = await createClient();

        // Rank 2: Session Re-validation - Check if user is already logged in
        const { data: existingSession, error: sessionError } =
          await supabase.auth.getSession();

        if (existingSession?.session) {
          // User is already logged in - this might be a re-authentication flow
          console.log("[Auth Callback] User already logged in, redirecting...");
          setStatus("already_logged_in");

          // Get user role for proper redirect
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            // Small delay to show success state before redirecting
            setTimeout(() => {
              router.replace(
                getDefaultLandingPath(
                  user.email?.includes("clinician") ? "CLINICIAN" : "PATIENT",
                ),
              );
            }, 1500);
            return;
          }
        }

        if (sessionError) {
          console.error("[Auth Callback] Session error:", sessionError);
          setErrorType("session_error");
          setErrorMessage(
            "Unable to verify your session. Please try logging in again.",
          );
          setStatus("error");
          return;
        }

        // Verify the token hash was received (logging for debugging - Rank 3)
        const tokenHash = searchParams.get("token_hash");
        const redirectTo = searchParams.get("redirectTo");

        console.log("[Auth Callback] Processing auth callback:", {
          hasTokenHash: !!tokenHash,
          redirectTo: redirectTo || "/",
          hasSession: !!existingSession?.session,
        });

        // If we got here with no session and no explicit error, it's likely a magic link flow
        // Supabase should have automatically created a session
        if (!existingSession?.session) {
          // Try to get session from URL hash (Supabase magic link behavior)
          setStatus("success");
          // The client-side Supabase auth listener should handle the actual session creation
          // Just redirect to the intended destination after a brief delay
          setTimeout(() => {
            router.replace(redirectTo || "/");
          }, 1500);
          return;
        }

        setStatus("success");
        setTimeout(() => {
          router.replace(redirectTo || "/");
        }, 1500);
      } catch (err) {
        console.error("[Auth Callback] Unexpected error:", err);
        setErrorType("unexpected");
        setErrorMessage(
          "An unexpected error occurred. Please try again or contact support.",
        );
        setStatus("error");
      }
    };

    handleCallback();
  }, [searchParams, router]);

  // Loading state
  if (status === "loading") {
    return (
      <main className="flex min-h-screen bg-base-200">
        <section className="flex-1 flex flex-col justify-center items-center px-8">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h1 className="text-2xl font-semibold">
              Verifying your session...
            </h1>
            <p className="text-muted">
              Please wait while we confirm your identity.
            </p>
          </div>
        </section>
      </main>
    );
  }

  // Already logged in state
  if (status === "already_logged_in") {
    return (
      <main className="flex min-h-screen bg-base-200">
        <section className="flex-1 flex flex-col justify-center items-center px-8">
          <div className="w-full max-w-md mx-auto space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-base-content">
                You're Already Logged In
              </h1>
              <p className="text-muted">Redirecting you to your dashboard...</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <main className="flex min-h-screen bg-base-200">
        <section className="flex-1 flex flex-col justify-center items-center px-8">
          <div className="w-full max-w-md mx-auto space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-base-content">
                Authentication Successful
              </h1>
              <p className="text-muted">Redirecting you...</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // Error state with detailed error information
  return (
    <main className="flex min-h-screen bg-base-200">
      <section className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Error Icon */}
          <div className="mx-auto w-16 h-16 bg-error/10 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-error" />
          </div>

          {/* Error Title - Context-aware based on error type */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-base-content">
              {errorType === "expired_link" && "Link Expired"}
              {errorType === "invalid_token" && "Invalid Link"}
              {errorType === "no_auth_params" && "Missing Information"}
              {errorType === "session_expired" && "Session Expired"}
              {errorType === "session_error" && "Verification Failed"}
              {errorType === "unexpected" && "Something Went Wrong"}
              {!errorType && "Authentication Error"}
            </h1>
            <p className="text-muted">{errorMessage}</p>
          </div>

          {/* Debug info for developers - only shown in development */}
          {process.env.NODE_ENV === "development" && errorType && (
            <div className="bg-base-300 p-4 rounded-lg text-xs font-mono space-y-1">
              <p className="font-semibold text-base-content">Debug Info:</p>
              <p className="text-muted">Error Type: {errorType}</p>
              <p className="text-muted">
                Query Params: {searchParams.toString()}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            <Link
              href="/login"
              className="btn btn-primary w-full rounded-xl flex items-center justify-center gap-2 h-12 shadow-sm font-medium"
            >
              <KeyRound className="h-4 w-4" />
              Go to Login
            </Link>
            <Link
              href="/clinician-forgot-password"
              className="btn btn-outline w-full rounded-xl flex items-center justify-center gap-2 h-12 font-medium"
            >
              <Clock className="h-4 w-4" />
              Request New Link
            </Link>
            <Link
              href="/"
              className="btn btn-ghost w-full rounded-xl flex items-center justify-center gap-2 h-12 font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>

          {/* Help text */}
          <p className="text-center text-sm text-muted">
            Need help?{" "}
            <Link href="/support" className="text-primary hover:underline">
              Contact Support
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
};

export default AuthCallbackPage;
