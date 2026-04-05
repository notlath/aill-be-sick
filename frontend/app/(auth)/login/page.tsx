"use client";

import { Suspense } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { patientLogin, patientSignup } from "@/actions/patient-auth";
import {
  EmailAuthSchema,
  EmailAuthSchemaType,
} from "@/schemas/EmailAuthSchema";
import {
  SignupWithConsentSchema,
  SignupWithConsentSchemaType,
} from "@/schemas/SignupWithConsentSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ArrowRight,
  Loader2,
  AlertTriangle,
  Stethoscope,
  ShieldCheck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useState, useEffect } from "react";

const LoginContent = () => {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSignupMode] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    const error = searchParams.get("oauth_error");
    if (error) {
      setOauthError(
        "No account found for this Google address. Please visit Bagong Silangan Barangay Health Center to register.",
      );
    }
  }, [searchParams]);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "session_expired") {
      toast.info("Your session expired. Please sign in again.");
    }
  }, [searchParams]);

  // Login form (simple, no consent needed)
  const loginForm = useForm<EmailAuthSchemaType>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(EmailAuthSchema),
  });

  // Signup form (with consent checkboxes)
  const signupForm = useForm<SignupWithConsentSchemaType>({
    defaultValues: {
      email: "",
      password: "",
      acceptedMedicalDisclaimer: false,
      acceptedAgeRequirement: false,
      acceptedTermsAndPrivacy: false,
    },
    resolver: zodResolver(SignupWithConsentSchema),
  });

  const { execute: execLogin, isExecuting: isLoggingIn } = useAction(
    patientLogin,
    {
      onSuccess: ({ data }) => {
        if (data?.error) {
          toast.error(data.error);
        }
      },
      onError: () => {
        toast.error("An unexpected error occurred during login.");
      },
    },
  );

  const { execute: execSignup, isExecuting: isSigningUp } = useAction(
    patientSignup,
    {
      onSuccess: ({ data }) => {
        if (data?.error) {
          toast.error(data.error);
        } else {
          toast.success("Check your email to confirm your account.");
          router.push("/verify-email");
        }
      },
      onError: () => {
        toast.error("An unexpected error occurred during signup.");
      },
    },
  );

  const handleLogin = loginForm.handleSubmit((formData) => {
    execLogin(formData);
  });

  const handleSignup = signupForm.handleSubmit((formData) => {
    execSignup(formData);
  });

  const handleSignInGoogle = async () => {
    try {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.NEXT_PUBLIC_VERCEL_URL ??
        "http://localhost:3000";

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${appUrl}/auth/callback`,
        },
      });

      if (error) {
        console.error(`Error during Google sign-in: ${error.message}`);
      }
    } catch (error) {
      console.error(`Error during Google sign-in: ${error}`);
    }
  };

  const isExecuting = isLoggingIn || isSigningUp;

  return (
    <main className="flex bg-base-100 min-h-screen">
      {/* Left Column - Auth Form */}
      <section className="flex-1 flex flex-col justify-center px-6 sm:px-12 md:px-20 lg:px-28 py-8">
        <div className="w-full max-w-md mx-auto">
          {/* Brand Header */}
          <div className="animate-fade-in mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-primary" strokeWidth={2} />
              </div>
              <span className="text-sm font-semibold tracking-wide text-primary uppercase">
                Patient Portal
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-3">
              {isSignupMode ? (
                "Create your account"
              ) : (
                <>
                  Welcome to
                  <br />
                  <span className="text-primary">AI&apos;ll Be Sick</span>
                </>
              )}
            </h1>
            <p className="text-muted text-base">
              {isSignupMode
                ? "Fill in your details to get started."
                : "Sign in to continue."}
            </p>
          </div>

          {/* Login Form */}
          {!isSignupMode && (
            <>
              <form
                onSubmit={handleLogin}
                className="animate-slide-up space-y-5"
                style={{ animationDelay: "0.1s" }}
              >
                <div className="space-y-1.5">
                  <label
                    className="text-sm font-medium leading-none"
                    htmlFor="login-email"
                  >
                    Email address
                  </label>
                  <Input
                    id="login-email"
                    type="email"
                    className="h-12"
                    placeholder="name@example.com"
                    {...loginForm.register("email")}
                  />
                  {loginForm.formState.errors.email && (
                    <span className="text-error text-xs font-medium">
                      {loginForm.formState.errors.email.message}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    className="text-sm font-medium leading-none"
                    htmlFor="login-password"
                  >
                    Password
                  </label>
                  <PasswordInput
                    id="login-password"
                    placeholder="••••••••"
                    className="h-12"
                    {...loginForm.register("password")}
                  />
                  {loginForm.formState.errors.password && (
                    <span className="text-error text-xs font-medium">
                      {loginForm.formState.errors.password.message}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isExecuting}
                  className="btn btn-primary w-full rounded-xl flex items-center justify-center gap-2 h-12 font-medium mt-2"
                >
                  {isLoggingIn ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Sign In <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-base-100 px-3 text-muted">Or</span>
                </div>
              </div>

              {/* Google Sign-In */}
              <button
                type="button"
                onClick={handleSignInGoogle}
                className="btn btn-outline w-full rounded-xl flex items-center bg-base-100 justify-center border-border gap-2 h-12 font-medium text-base-content"
                disabled={isExecuting}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </button>

              {/* OAuth Error */}
              {oauthError && (
                <div className="alert alert-warning py-3 mb-4">
                  <span className="text-sm">{oauthError}</span>
                </div>
              )}
              {/* Account Help */}
              <p
                className="animate-slide-up text-center text-sm text-muted mt-5"
                style={{ animationDelay: "0.3s" }}
              >
                Need an account? Visit Bagong Silangan Health Center to have a clinician create one for you.
              </p>
            </>
          )}

          {/* Signup Form */}
          {isSignupMode && (
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium leading-none"
                  htmlFor="signup-email"
                >
                  Email address
                </label>
                <Input
                  id="signup-email"
                  type="email"
                  className="h-12"
                  placeholder="name@example.com"
                  {...signupForm.register("email")}
                />
                {signupForm.formState.errors.email && (
                  <span className="text-error text-xs font-medium">
                    {signupForm.formState.errors.email.message}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium leading-none"
                  htmlFor="signup-password"
                >
                  Password
                </label>
                <PasswordInput
                  id="signup-password"
                  placeholder="••••••••"
                  className="h-12"
                  {...signupForm.register("password")}
                />
                {signupForm.formState.errors.password && (
                  <span className="text-error text-xs font-medium">
                    {signupForm.formState.errors.password.message}
                  </span>
                )}
              </div>

              {/* Consent Checkboxes */}
              <div className="space-y-4 pt-2">
                {/* Medical Disclaimer Alert */}
                <div className="alert alert-warning py-3">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p className="text-xs">
                    This is a research tool, NOT a replacement for professional
                    medical care.
                  </p>
                </div>

                {/* Checkbox 1: Medical Disclaimer */}
                <label className="cursor-pointer flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary mt-0.5"
                    {...signupForm.register("acceptedMedicalDisclaimer")}
                  />
                  <span className="text-sm leading-tight">
                    I understand this is a <strong>research tool</strong> and{" "}
                    <strong>NOT medical advice</strong>. I will consult
                    healthcare professionals for medical concerns.
                  </span>
                </label>
                {signupForm.formState.errors.acceptedMedicalDisclaimer && (
                  <span className="text-error text-xs font-medium block ml-7">
                    {
                      signupForm.formState.errors.acceptedMedicalDisclaimer
                        .message
                    }
                  </span>
                )}

                {/* Checkbox 2: Age Requirement */}
                <label className="cursor-pointer flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary mt-0.5"
                    {...signupForm.register("acceptedAgeRequirement")}
                  />
                  <span className="text-sm leading-tight">
                    I am <strong>18 years or older</strong>, OR I have{" "}
                    <strong>parental/guardian permission</strong> to use this
                    service.
                  </span>
                </label>
                {signupForm.formState.errors.acceptedAgeRequirement && (
                  <span className="text-error text-xs font-medium block ml-7">
                    {signupForm.formState.errors.acceptedAgeRequirement.message}
                  </span>
                )}

                {/* Checkbox 3: Terms & Privacy */}
                <label className="cursor-pointer flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary mt-0.5"
                    {...signupForm.register("acceptedTermsAndPrivacy")}
                  />
                  <span className="text-sm leading-tight">
                    I agree to the{" "}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="link link-primary"
                    >
                      Privacy Policy
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/terms"
                      target="_blank"
                      className="link link-primary"
                    >
                      Terms of Service
                    </Link>
                    .
                  </span>
                </label>
                {signupForm.formState.errors.acceptedTermsAndPrivacy && (
                  <span className="text-error text-xs font-medium block ml-7">
                    {
                      signupForm.formState.errors.acceptedTermsAndPrivacy
                        .message
                    }
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isExecuting}
                  className="btn btn-primary w-full rounded-xl flex items-center justify-center gap-2 h-12 font-medium"
                >
                  {isSigningUp ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Create Account <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <Link
                  href="/login"
                  className="btn btn-outline border-border w-full rounded-xl flex items-center justify-center gap-2 h-12 font-medium bg-base-100 text-base-content"
                >
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}

          {/* Footer Links */}
          <div
            className="animate-slide-up border-t border-border mt-8 pt-6 space-y-2"
            style={{ animationDelay: "0.35s" }}
          >
            <p className="text-center text-sm text-muted">
              Not a patient?{" "}
              <Link
                href="/clinician-login"
                className="text-primary font-medium hover:underline transition-all cursor-pointer"
              >
                Clinician sign in
              </Link>
            </p>
            <p className="text-center text-sm text-muted">
              Admin?{" "}
              <Link
                href="/admin-login"
                className="text-primary font-medium hover:underline transition-all cursor-pointer"
              >
                Admin sign in
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Right Column - Hero Panel */}
      <section className="hidden lg:flex lg:flex-1 relative p-2">
        <div className="relative w-full h-full rounded-3xl overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2940&auto=format&fit=crop"
            alt="Medical professional reviewing patient data"
            className="w-full h-full object-cover"
          />
          {/* Overlay content on the image */}
          <div className="absolute inset-0 bg-neutral/50" />
          <div className="absolute bottom-0 left-0 right-0 p-10">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className="w-5 h-5 text-primary"
                  strokeWidth={2.5}
                />
                <span
                  className="text-sm font-semibold text-neutral-content uppercase tracking-wide"
                  style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
                >
                  Trusted Health Partner
                </span>
              </div>
              <h2
                className="text-3xl font-bold text-neutral-content leading-snug"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
              >
                AI-assisted symptom checking for{" "}
                <span className="text-primary">Bagong Silangan</span>
              </h2>
              <p
                className="text-neutral-content/80 text-sm leading-relaxed max-w-md"
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
              >
                Powered by advanced language models trained on clinical data.
                Always consult your healthcare provider for medical decisions.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

const LoginPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
};

export default LoginPage;
