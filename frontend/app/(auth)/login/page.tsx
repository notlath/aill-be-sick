"use client";

import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { patientLogin } from "@/actions/patient-auth";
import {
  EmailAuthSchema,
  EmailAuthSchemaType,
} from "@/schemas/EmailAuthSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowRight, Loader2, Info } from "lucide-react";
import { Input } from "@/components/ui/input";

const HomePage = () => {
  // Login form
  const loginForm = useForm<EmailAuthSchemaType>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(EmailAuthSchema),
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

  const handleLogin = loginForm.handleSubmit((formData) => {
    execLogin(formData);
  });

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
              Welcome back. Please sign in to continue.
            </p>
          </div>

          {/* Login Form */}
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
                placeholder="Enter your password"
                {...loginForm.register("password")}
              />
              {loginForm.formState.errors.password && (
                <span className="text-error text-xs font-medium">
                  {loginForm.formState.errors.password.message}
                </span>
              )}
            </div>

            <div className="pt-2">
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
            </div>
          </form>

          {/* Info alert for account creation */}
          <div className="alert bg-base-100 border border-border">
            <Info className="h-5 w-5 text-info shrink-0" />
            <div>
              <p className="text-sm">
                <strong>Need an account?</strong> Please contact your clinician
                to create one for you.
              </p>
            </div>
          </div>

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
