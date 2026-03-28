"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Suspense } from "react";

function AuthCodeErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const error = searchParams.get("error");
  const message = searchParams.get("message");
  const description = searchParams.get("description");

  const errorMessages: Record<
    string,
    { title: string; description: string; showExpiredInviteLink?: boolean }
  > = {
    no_code: {
      title: "No Authorization Code",
      description:
        "The OAuth provider did not return an authorization code. Please try signing in again.",
    },
    no_token: {
      title: "Invite Link Invalid or Expired",
      description:
        "The invite link may have already been used or has expired. If you're a patient, please contact your clinician to request a new invite link.",
      showExpiredInviteLink: true,
    },
    exchange_failed: {
      title: "Code Exchange Failed",
      description:
        message ||
        "Failed to exchange the authorization code for a session. This may indicate a configuration issue with your OAuth provider.",
    },
    validation_failed: {
      title: "Validation Failed",
      description:
        "The OAuth flow validation failed. Both auth code and code verifier should be non-empty. Try clearing your browser cookies and signing in again.",
    },
    session_error: {
      title: "Session Error",
      description:
        message ||
        "There was a problem creating your session. Please try signing in again.",
    },
    oauth_failed: {
      title: "OAuth Sign-In Failed",
      description:
        "The external sign-in process failed. Please try again or use a different sign-in method.",
    },
    config_error: {
      title: "Configuration Error",
      description:
        "The authentication system is not properly configured. Please contact support.",
    },
    client_error: {
      title: "Client Error",
      description:
        "An unexpected error occurred on the client side. Please try again.",
    },
    internal: {
      title: "Internal Server Error",
      description:
        "An unexpected error occurred during the authentication process. Please try again.",
    },
    default: {
      title: "Authentication Error",
      description:
        error ||
        description ||
        "An error occurred during the authentication process.",
    },
  };

  const errorInfo = errorMessages[error || ""] || errorMessages.default;

  return (
    <main className="flex h-screen items-center justify-center">
      <section className="max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <AlertCircle className="size-8 text-red-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{errorInfo.title}</h1>
          <p className="text-muted-foreground text-sm">
            {errorInfo.description}
          </p>
        </div>

        <div className="space-y-2">
          {error && (
            <p className="text-muted-foreground bg-base-200 rounded p-2 font-mono text-xs">
              Error: {error}
            </p>
          )}
        </div>

        <div className="flex justify-center gap-2 pt-4">
          {errorInfo.showExpiredInviteLink ? (
            <Link href="/auth/expired-invite" className="btn btn-primary">
              Learn More
            </Link>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="btn btn-primary"
            >
              Try Again
            </button>
          )}
          <Link href="/" className="btn btn-ghost">
            Go Home
          </Link>
        </div>

        <p className="text-muted-foreground text-xs">
          {errorInfo.showExpiredInviteLink
            ? "If you're a patient, contact your clinician to request a new invite. Admins can resend invites from the Users page."
            : "If the problem persists, contact support or check your OAuth provider configuration."}
        </p>
      </section>
    </main>
  );
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense
      fallback={
        <main className="flex h-screen items-center justify-center">
          <section className="max-w-md space-y-6 text-center">
            <div className="flex justify-center">
              <div className="bg-base-200 rounded-full p-4">
                <AlertCircle className="text-base-content/50 size-8 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Loading...</h1>
            </div>
          </section>
        </main>
      }
    >
      <AuthCodeErrorContent />
    </Suspense>
  );
}
