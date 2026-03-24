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
import { ArrowRight, Loader2 } from "lucide-react";

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

  return (
    <main className="flex min-h-screen bg-base-200">
      {/* Left Column - Auth Form */}
      <section className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="space-y-3 text-center lg:text-left">
            <h1 className="text-6xl font-bold tracking-tight">AI'll Be Sick</h1>
            <p className="text-muted text-lg">Clinician Portal Access</p>
            <p className="text-sm text-muted">
              New clinician accounts require admin approval before access.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={isLoggingIn}
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

              <div className="relative my-2">
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
                onClick={handleSignup}
                disabled={isSigningUp}
                className="btn btn-outline border-border w-full rounded-xl flex items-center justify-center gap-2 h-12 font-medium bg-base-100 text-base-content"
              >
                {isSigningUp ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Create clinician account"
                )}
              </button>
            </div>

            <p className="text-center text-sm text-muted pt-4">
              Not a clinician? Click{" "}
              <Link
                href="/login"
                className="text-primary font-medium hover:underline transition-all cursor-pointer"
              >
                here
              </Link>{" "}
              to log in as a patient
            </p>
            <p className="text-center text-sm text-muted mt-2">
              Admin? Click{" "}
              <Link
                href="/admin-login"
                className="text-primary font-medium hover:underline transition-all cursor-pointer"
              >
                here
              </Link>
            </p>
          </form>
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

export default ClinicianLoginPage;
