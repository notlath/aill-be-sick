"use client";

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
import { ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const HomePage = () => {
  const supabase = createClient();
  const router = useRouter();
  const [isSignupMode, setIsSignupMode] = useState(false);

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
    }
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
    }
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

  // Switch between login and signup modes
  const toggleMode = () => {
    setIsSignupMode(!isSignupMode);
    // Reset forms when switching
    loginForm.reset();
    signupForm.reset();
  };

  return (
    <main className="flex bg-base-200 min-h-screen">
      {/* Left Column - Auth Form */}
      <section className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32 py-8">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="space-y-3 text-center lg:text-left">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
              AI&apos;ll Be Sick
            </h1>
            <p className="text-muted text-lg">
              {isSignupMode
                ? "Create your account to get started."
                : "Welcome back. Please sign in to continue."}
            </p>
          </div>

          {/* Login Form */}
          {!isSignupMode && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
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

              <div className="space-y-2">
                <label
                  className="text-sm font-medium leading-none"
                  htmlFor="login-password"
                >
                  Password
                </label>
                <Input
                  id="login-password"
                  type="password"
                  className="h-12"
                  placeholder="••••••••"
                  {...loginForm.register("password")}
                />
                {loginForm.formState.errors.password && (
                  <span className="text-error text-xs font-medium">
                    {loginForm.formState.errors.password.message}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isExecuting}
                  className="btn btn-primary w-full rounded-xl flex items-center justify-center gap-2 h-12 font-medium"
                >
                  {isLoggingIn ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Sign In <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleMode}
                  disabled={isExecuting}
                  className="btn btn-outline border-border w-full rounded-xl flex items-center justify-center gap-2 h-12 font-medium bg-base-100 text-base-content"
                >
                  Create patient account
                </button>
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-base-200/50 px-2 text-muted-foreground bg-base-100">
                    Or
                  </span>
                </div>
              </div>

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
            </form>
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
                <Input
                  id="signup-password"
                  type="password"
                  className="h-12"
                  placeholder="••••••••"
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
                    {signupForm.formState.errors.acceptedTermsAndPrivacy.message}
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

                <button
                  type="button"
                  onClick={toggleMode}
                  disabled={isExecuting}
                  className="btn btn-outline border-border w-full rounded-xl flex items-center justify-center gap-2 h-12 font-medium bg-base-100 text-base-content"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* Footer Links */}
          <div className="space-y-2 pt-2">
            <p className="text-center text-sm text-muted">
              Not a patient? Click{" "}
              <Link
                href="/clinician-login"
                className="text-primary font-medium hover:underline transition-all cursor-pointer"
              >
                here
              </Link>{" "}
              to log in as a clinician
            </p>
            <p className="text-center text-sm text-muted">
              Admin? Click{" "}
              <Link
                href="/admin-login"
                className="text-primary font-medium hover:underline transition-all cursor-pointer"
              >
                here
              </Link>
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

export default HomePage;
