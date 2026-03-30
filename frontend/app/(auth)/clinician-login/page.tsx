"use client";

import { emailLogin, emailSignup } from "@/actions/email-auth";
import {
  EmailAuthSchema,
  EmailAuthSchemaType,
} from "@/schemas/EmailAuthSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowRight, Loader2, Stethoscope, ShieldCheck } from "lucide-react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

const ClinicianLoginPage = () => {
  const router = useRouter();
  const form = useForm<EmailAuthSchemaType>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(EmailAuthSchema),
  });
  const { execute: execLogin, isExecuting: isLoggingIn } = useAction(
    emailLogin,
    {
      onSuccess: ({ data }) => {
        if (data?.error) {
          toast.error(data.error);
        }
      },
      onError: ({ error }) => {
        toast.error("An unexpected error occurred during login.");
      },
    },
  );
  const { execute: execSignup, isExecuting: isSigningUp } = useAction(
    emailSignup,
    {
      onSuccess: ({ data }) => {
        if (data?.error) {
          toast.error(data.error);
        } else {
          toast.success(
            "Signup complete. Please verify your email and wait for admin approval.",
          );
          router.push("/waiting-for-approval");
        }
      },
      onError: ({ error }) => {
        toast.error("An unexpected error occurred during signup.");
      },
    },
  );

  const handleLogin = form.handleSubmit((formData) => {
    execLogin(formData);
  });

  const handleSignup = form.handleSubmit((formData) => {
    execSignup(formData);
  });

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
                Clinician Portal
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-3">
              Welcome to
              <br />
              <span className="text-primary">AI&apos;ll Be Sick</span>
            </h1>
            <p className="text-muted text-base">
              Clinician Portal Access
            </p>
            <p className="text-sm text-muted mt-1">
              New clinician accounts require admin approval before access.
            </p>
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleLogin}
            className="animate-slide-up space-y-5"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium leading-none"
                htmlFor="email"
              >
                Email address
              </label>
              <Input
                id="email"
                type="email"
                className="h-12"
                placeholder="doctor@hospital.com"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <span className="text-error text-xs font-medium">
                  {form.formState.errors.email.message}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  className="text-sm font-medium leading-none"
                  htmlFor="password"
                >
                  Password
                </label>
                <Link
                  href="/clinician-forgot-password"
                  className="text-xs font-medium text-primary hover:underline transition-all cursor-pointer"
                >
                  Forgot Password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
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

            {/* Divider */}
            <div
              className="animate-slide-up relative my-6"
              style={{ animationDelay: "0.15s" }}
            >
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-base-100 px-3 text-muted">Or</span>
              </div>
            </div>

            {/* Create Clinician Account */}
            <button
              type="button"
              onClick={handleSignup}
              disabled={isExecuting}
              className="animate-slide-up btn btn-outline border-border w-full rounded-xl flex items-center justify-center gap-2 h-12 font-medium bg-base-100 text-base-content"
              style={{ animationDelay: "0.2s" }}
            >
              {isSigningUp ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Create clinician account"
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div
            className="animate-slide-up border-t border-border mt-8 pt-6 space-y-2"
            style={{ animationDelay: "0.25s" }}
          >
            <p className="text-center text-sm text-muted">
              Not a clinician?{" "}
              <Link
                href="/login"
                className="text-primary font-medium hover:underline transition-all cursor-pointer"
              >
                Patient sign in
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
            src="https://images.unsplash.com/photo-1584982751601-97dcc096659c?q=80&w=3272&auto=format&fit=crop"
            alt="Modern clinic interior"
            className="w-full h-full object-cover"
          />
          {/* Overlay content on the image */}
          <div className="absolute inset-0 bg-neutral/50" />
          <div className="absolute bottom-0 left-0 right-0 p-10">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" strokeWidth={2.5} />
                <span
                  className="text-sm font-semibold text-neutral-content uppercase tracking-wide"
                  style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
                >
                  Clinician Dashboard
                </span>
              </div>
              <h2
                className="text-3xl font-bold text-neutral-content leading-snug"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
              >
                Manage patients and support{" "}
                <span className="text-primary">better health outcomes</span>
              </h2>
              <p
                className="text-neutral-content/80 text-sm leading-relaxed max-w-md"
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
              >
                Create patient accounts, review AI-assisted diagnoses, and
                monitor community health trends.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ClinicianLoginPage;
