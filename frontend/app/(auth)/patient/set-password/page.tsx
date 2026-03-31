"use client";

import { updatePassword } from "@/actions/email-auth";
import {
  ResetPasswordSchema,
  ResetPasswordSchemaType,
} from "@/schemas/ResetPasswordSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";

const PatientSetPasswordPage = () => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [patientEmail, setPatientEmail] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [tokenAlreadyUsed, setTokenAlreadyUsed] = useState(false);

  const form = useForm<ResetPasswordSchemaType>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    resolver: zodResolver(ResetPasswordSchema),
  });

  // Validate token and get patient info on mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        // Get Supabase client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          setTokenError("Configuration error. Please contact support.");
          setIsValidatingToken(false);
          return;
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Get current session
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          console.error("[Set Password] Session error:", sessionError);

          // Check if token is expired
          if (
            sessionError.message?.includes("expired") ||
            sessionError.message?.includes("invalid") ||
            sessionError.code === "otp_expired" ||
            sessionError.code === "session_expired"
          ) {
            setTokenExpired(true);
            setTokenError(
              "This invite link has expired. Please request a new invite from your health center.",
            );
          } else {
            setTokenError(
              "Invalid or expired invite link. Please request a new invite.",
            );
          }
          setIsValidatingToken(false);
          return;
        }

        if (!sessionData.session) {
          // No session - check if this is an already-used token
          // Supabase returns 401 for already-used tokens
          const { data: userData, error: userError } =
            await supabase.auth.getUser();

          if (userError) {
            if (
              userError.message?.includes("already") ||
              userError.message?.includes("used") ||
              userError.status === 401
            ) {
              setTokenAlreadyUsed(true);
              setTokenError(
                "This invite link has already been used. Please log in or contact support if you need assistance.",
              );
            } else if (userError.message?.includes("expired")) {
              setTokenExpired(true);
              setTokenError(
                "This invite link has expired. Please request a new invite from your health center.",
              );
            } else {
              setTokenError(
                "Invalid invite link. Please request a new invite from your health center.",
              );
            }
            setIsValidatingToken(false);
            return;
          }

          if (userData.user) {
            // User exists but no session - token might be already used
            setTokenAlreadyUsed(true);
            setTokenError(
              "This invite link has already been used. Please log in or contact support if you need assistance.",
            );
            setIsValidatingToken(false);
            return;
          }

          setTokenError(
            "Invalid invite link. Please request a new invite from your health center.",
          );
          setIsValidatingToken(false);
          return;
        }

        // Session exists - get user info
        const { data: userData, error: userError } =
          await supabase.auth.getUser();

        if (userError || !userData.user) {
          setTokenError(
            "Unable to verify your account. Please try again or contact support.",
          );
          setIsValidatingToken(false);
          return;
        }

        // Set patient info from session
        const user = userData.user;
        setPatientEmail(user.email || null);
        setPatientName(user.user_metadata?.name || null);

        console.log("[Set Password] Token validated successfully");
        setIsValidatingToken(false);
      } catch (err) {
        console.error("[Set Password] Unexpected error:", err);
        setTokenError(
          "An unexpected error occurred. Please try again or contact support.",
        );
        setIsValidatingToken(false);
      }
    };

    validateToken();
  }, []);

  const { execute: execUpdate, isExecuting } = useAction(updatePassword, {
    onSuccess: ({ data }) => {
      if (data?.error) {
        toast.error(data.error);
      } else {
        setSuccessMessage("Password set successfully.");
      }
    },
    onError: ({ error }) => {
      toast.error("An unexpected error occurred. Please try again.");
    },
  });

  const handleUpdate = form.handleSubmit((formData) => {
    execUpdate(formData);
  });

  // Show loading state while validating token
  if (isValidatingToken) {
    return (
      <main className="flex min-h-screen bg-base-200">
        <section className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32">
          <div className="w-full max-w-md mx-auto space-y-8 text-center">
            <div className="mx-auto w-12 h-12 bg-base-300 rounded-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-base-content">
                Verifying your invite...
              </h2>
              <p className="text-muted text-sm">
                Please wait while we validate your invitation link.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // Show token error state
  if (tokenError) {
    return (
      <main className="flex min-h-screen bg-base-200">
        <section className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32">
          <div className="w-full max-w-md mx-auto space-y-8">
            <div className="space-y-3 text-center lg:text-left">
              <div className="flex justify-center lg:justify-start">
                <div
                  className={`rounded-full p-4 ${tokenExpired ? "bg-warning/10" : "bg-error/10"}`}
                >
                  {tokenExpired ? (
                    <Clock className="size-8 text-warning" />
                  ) : (
                    <AlertCircle className="size-8 text-error" />
                  )}
                </div>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">
                {tokenExpired ? "Invitation Expired" : "Invalid Invitation"}
              </h1>
              <p className="text-muted text-lg">{tokenError}</p>
            </div>

            <div className="bg-base-100 p-6 rounded-2xl border border-border space-y-4">
              {tokenExpired && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-base-content">
                    Why did this happen?
                  </h3>
                  <p className="text-sm text-muted">
                    For security reasons, account invitation links expire after
                    24 hours. If you received this link but didn't use it in
                    time, you'll need a new invitation.
                  </p>
                </div>
              )}

              {tokenAlreadyUsed && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-base-content">
                    What should you do?
                  </h3>
                  <p className="text-sm text-muted">
                    This invite link has already been used to create an account.
                    If you already have an account, please log in. If you need
                    help, contact your health center.
                  </p>
                </div>
              )}

              {!tokenExpired && !tokenAlreadyUsed && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-base-content">
                    What should you do?
                  </h3>
                  <p className="text-sm text-muted">
                    Please return to Bagong Silangan Barangay Health Center and
                    ask the staff to send you a new invitation link.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Link
                href="/login"
                className="btn btn-primary w-full rounded-xl flex items-center justify-center gap-2 h-12 shadow-sm font-medium"
              >
                Go to Login Page
              </Link>

              <p className="text-center text-sm text-muted">
                Need help? Visit the health center or contact support.
              </p>
            </div>
          </div>
        </section>

        {/* Right Column - Image */}
        <section className="hidden lg:block lg:flex-1 relative p-2">
          <img
            src="https://images.unsplash.com/photo-1584982751601-97dcc096659c?q=80&w=3272&auto=format&fit=crop"
            alt="Modern clinic interior"
            className="w-full h-full object-cover rounded-3xl"
          />
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-base-200">
      {/* Left Column - Auth Form */}
      <section className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="space-y-3 text-center lg:text-left">
            <h1 className="text-6xl font-bold tracking-tight">AI'll Be Sick</h1>
            <p className="text-muted text-lg">
              Patient Portal - Set Your Password
            </p>
          </div>

          {/* Patient Info Display */}
          {(patientEmail || patientName) && (
            <div className="bg-base-100 p-4 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-base-content">
                    You are setting up the account for:
                  </p>
                  {patientName && (
                    <p className="text-base font-semibold text-base-content truncate">
                      {patientName}
                    </p>
                  )}
                  {patientEmail && (
                    <p className="text-sm text-muted truncate">
                      {patientEmail}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {successMessage ? (
            <div className="bg-base-100 p-8 rounded-2xl border border-border space-y-6 text-center shadow-sm">
              <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-base-content">
                  Password Set
                </h3>
                <p className="text-muted text-sm">{successMessage}</p>
                <p className="text-muted text-sm">
                  You can now log in with your email and password.
                </p>
              </div>
              <Link
                href="/login"
                className="btn btn-primary w-full rounded-xl flex items-center justify-center gap-2 h-12 shadow-sm font-medium"
              >
                Go to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-5">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  htmlFor="password"
                >
                  Password
                </label>
                <PasswordInput
                  id="password"
                  className="h-12"
                  placeholder="••••••••"
                  {...form.register("password")}
                />
                {form.formState.errors.password && (
                  <span className="text-error text-xs font-medium">
                    {form.formState.errors.password.message}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  htmlFor="confirmPassword"
                >
                  Confirm Password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  className="h-12"
                  placeholder="••••••••"
                  {...form.register("confirmPassword")}
                />
                {form.formState.errors.confirmPassword && (
                  <span className="text-error text-xs font-medium">
                    {form.formState.errors.confirmPassword.message}
                  </span>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isExecuting}
                  className="btn btn-primary w-full rounded-xl flex items-center justify-center gap-2 h-12 shadow-sm font-medium"
                >
                  {isExecuting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Set Password"
                  )}
                </button>
              </div>

              <div className="text-center pt-4">
                <Link
                  href="/login"
                  className="text-primary text-sm font-medium inline-flex items-center gap-2 hover:underline transition-all cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Right Column - Image */}
      <section className="hidden lg:block lg:flex-1 relative p-2">
        <img
          src="https://images.unsplash.com/photo-1584982751601-97dcc096659c?q=80&w=3272&auto=format&fit=crop"
          alt="Modern clinic interior"
          className="w-full h-full object-cover rounded-3xl"
        />
      </section>
    </main>
  );
};

export default PatientSetPasswordPage;
