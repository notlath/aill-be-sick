"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { resendVerificationEmail } from "@/actions/resend-verification-email";
import { logout } from "@/actions/logout";
import { Mail, Loader2, RefreshCw, LogOut, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const VerifyEmailPendingPage = () => {
  const [emailSent, setEmailSent] = useState(false);

  const { execute: execResend, isExecuting: isResending } = useAction(
    resendVerificationEmail,
    {
      onSuccess: ({ data }) => {
        if (data?.error) {
          toast.error(data.error);
        } else if (data?.success) {
          setEmailSent(true);
          toast.success("Verification email sent! Check your inbox.");
        }
      },
      onError: () => {
        toast.error("An unexpected error occurred. Please try again.");
      },
    }
  );

  const { execute: execLogout, isExecuting: isLoggingOut } = useAction(logout, {
    onError: () => {
      toast.error("Failed to sign out. Please try again.");
    },
  });

  return (
    <main className="flex min-h-screen bg-base-200">
      {/* Left Column - Content */}
      <section className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="space-y-3 text-center lg:text-left">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
              AI&apos;ll Be Sick
            </h1>
            <p className="text-muted text-lg">Verify your email to continue</p>
          </div>

          <div className="bg-base-100 p-6 rounded-2xl border border-border space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-info/10 rounded-full flex items-center justify-center">
                <Mail className="h-5 w-5 text-info" />
              </div>
              <div>
                <h2 className="font-medium">Email Verification Required</h2>
                <p className="text-sm text-muted">
                  Your clinician created this account for you.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted">
              Before you can use the diagnosis features, please verify your
              email address by clicking the link we sent you.
            </p>
          </div>

          {emailSent && (
            <div className="alert alert-success">
              <CheckCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Verification email sent</p>
                <p className="text-sm">
                  Check your inbox and spam folder for the verification link.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => execResend()}
              disabled={isResending}
              className="btn btn-primary w-full rounded-xl flex items-center justify-center gap-2 h-12 font-medium"
            >
              {isResending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Resend Verification Email
                </>
              )}
            </button>

            <button
              onClick={() => execLogout()}
              disabled={isLoggingOut}
              className="btn btn-ghost w-full rounded-xl flex items-center justify-center gap-2 h-12 font-medium"
            >
              {isLoggingOut ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted">
              Already verified?{" "}
              <button
                onClick={() => window.location.reload()}
                className="text-primary font-medium hover:underline"
              >
                Refresh this page
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* Right Column - Image */}
      <section className="hidden lg:block lg:flex-1 relative p-2 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2940&auto=format&fit=crop"
          alt="Medical professional reviewing patient data"
          className="w-full h-full object-cover rounded-3xl"
        />
      </section>
    </main>
  );
};

export default VerifyEmailPendingPage;
