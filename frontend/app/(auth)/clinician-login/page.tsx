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

import Link from "next/link";
import { useRouter } from "next/navigation";

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
    }
  );
  const { execute: execSignup, isExecuting: isSigningUp } = useAction(
    emailSignup,
    {
      onSuccess: ({ data }) => {
        if (data?.error) {
          toast.error(data.error);
        } else {
          toast.success("Check your email to confirm your account.");
          router.push("/clinician-login");
        }
      },
      onError: ({ error }) => {
        toast.error("An unexpected error occurred during signup.");
      },
    }
  );

  const handleLogin = form.handleSubmit((formData) => {
    execLogin(formData);
  });

  const handleSignup = form.handleSubmit((formData) => {
    execSignup(formData);
  });

  return (
    <main className="flex justify-center items-center h-screen">
      <section className="space-y-4 text-center">
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="font-bold text-5xl">AI'll Be Sick</h1>
            <p className="text-muted">
              Login with your credentials as clinician
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 bg-base-200 p-4 card-border border-border card">
            <div className="space-y-1 text-left">
              <label className="label">Email</label>
              <input
                type="email"
                className="outline-none input"
                placeholder="Email"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <span className="text-error text-sm">
                  {form.formState.errors.email.message}
                </span>
              )}
            </div>
            <div className="space-y-1 text-left">
              <label className="label">Password</label>
              <input
                type="password"
                className="outline-none input"
                placeholder="Password"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <span className="text-error text-sm">
                  {form.formState.errors.password.message}
                </span>
              )}
              <div className="text-right">
                <Link
                  href="/clinician-forgot-password"
                  className="link link-hover text-sm"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoggingIn}
                className="flex-1 btn btn-primary"
              >
                {isLoggingIn ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  "Log in"
                )}
              </button>
              <button
                type="button"
                onClick={handleSignup}
                className="flex-1 border border-border btn"
                disabled={isSigningUp}
              >
                {isSigningUp ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  "Sign up"
                )}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
};

export default ClinicianLoginPage;
