"use client";

import { adminLogin, adminSignup } from "@/actions/admin-auth";
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
import { PasswordInput } from "@/components/ui/password-input";

const AdminLoginPage = () => {
  const router = useRouter();
  const form = useForm<EmailAuthSchemaType>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(EmailAuthSchema),
  });
  const { execute: execLogin, isExecuting: isLoggingIn } = useAction(
    adminLogin,
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
    adminSignup,
    {
      onSuccess: ({ data }) => {
        if (data?.error) {
          toast.error(data.error);
        } else {
          toast.success("Check your email to confirm your account.");
          router.push("/admin-login");
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
            <p className="text-muted text-lg">Admin Portal Access</p>
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
                placeholder="admin@organization.com"
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
            </div>

            <p className="text-center text-sm text-muted pt-4">
              Not an admin? Click{" "}
              <Link
                href="/login"
                className="text-primary font-medium hover:underline transition-all cursor-pointer"
              >
                here
              </Link>{" "}
              to log in as a patient
            </p>
            <p className="text-center text-sm text-muted mt-2">
              Clinician? Click{" "}
              <Link
                href="/clinician-login"
                className="text-primary font-medium hover:underline transition-all cursor-pointer"
              >
                here
              </Link>{" "}
              to log in
            </p>
          </form>
        </div>
      </section>

      {/* Right Column - Image */}
      <section className="hidden lg:block lg:flex-1 relative p-2">
        <img
          src="https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2774&auto=format&fit=crop"
          alt="Modern office interior"
          className="w-full h-full object-cover rounded-3xl"
        />
      </section>
    </main>
  );
};

export default AdminLoginPage;
