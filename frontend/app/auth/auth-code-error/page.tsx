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

  const errorMessages: Record<string, { title: string; description: string }> =
    {
      no_code: {
        title: "No Authorization Code",
        description:
          "The OAuth provider did not return an authorization code. Please try signing in again.",
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
      internal: {
        title: "Internal Server Error",
        description:
          "An unexpected error occurred during the authentication process. Please try again.",
      },
      default: {
        title: "Authentication Error",
        description:
          error || description || "An error occurred during the authentication process.",
      },
    };

  const errorInfo = errorMessages[error || ""] || errorMessages.default;

  return (
    <main className="flex justify-center items-center h-screen">
      <section className="space-y-6 text-center max-w-md">
        <div className="flex justify-center">
          <div className="bg-red-100 p-4 rounded-full">
            <AlertCircle className="size-8 text-red-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="font-bold text-2xl">{errorInfo.title}</h1>
          <p className="text-sm text-muted-foreground">{errorInfo.description}</p>
        </div>

        <div className="space-y-2">
          {error && (
            <p className="text-xs text-muted-foreground bg-base-200 p-2 rounded font-mono">
              Error: {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 justify-center pt-4">
          <button
            onClick={() => router.push("/login")}
            className="btn btn-primary"
          >
            Try Again
          </button>
          <Link href="/" className="btn btn-ghost">
            Go Home
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          If the problem persists, contact support or check your OAuth provider configuration.
        </p>
      </section>
    </main>
  );
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense
      fallback={
        <main className="flex justify-center items-center h-screen">
          <section className="space-y-6 text-center max-w-md">
            <div className="flex justify-center">
              <div className="bg-base-200 p-4 rounded-full">
                <AlertCircle className="size-8 text-base-content/50 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="font-bold text-2xl">Loading...</h1>
            </div>
          </section>
        </main>
      }
    >
      <AuthCodeErrorContent />
    </Suspense>
  );
}
