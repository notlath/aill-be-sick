"use client";

import { requestPasswordReset } from "@/actions/email-auth";
import {
  RequestResetPasswordSchema,
  RequestResetPasswordSchemaType,
} from "@/schemas/ResetPasswordSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ClinicianForgotPasswordPage = () => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<RequestResetPasswordSchemaType>({
    defaultValues: {
      email: "",
    },
    resolver: zodResolver(RequestResetPasswordSchema),
  });

  const { execute: execReset, isExecuting } = useAction(requestPasswordReset, {
    onSuccess: ({ data }) => {
      if (data?.error) {
        toast.error(data.error);
      } else {
        setSuccessMessage("Password reset link sent to your email.");
      }
    },
    onError: ({ error }) => {
      toast.error("An unexpected error occurred. Please try again.");
    },
  });

  const handleReset = form.handleSubmit((formData) => {
    execReset(formData);
  });

  return (
    <main className="flex min-h-screen bg-base-200">
      {/* Left Column - Auth Form */}
      <section className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="space-y-3 text-center lg:text-left">
            <h1 className="text-6xl font-bold tracking-tight">AI'll Be Sick</h1>
            <p className="text-muted text-lg">
              Clinician Portal - Reset Password
            </p>
          </div>

          {successMessage ? (
            <div className="bg-base-100 p-8 rounded-2xl border border-border space-y-6 text-center shadow-sm">
              <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                <Mail className="h-6 w-6 text-success" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-base-content">Check your email</h3>
                <p className="text-muted text-sm">{successMessage}</p>
              </div>
              <Link
                href="/clinician-login"
                className="btn btn-outline border-border w-full rounded-xl flex items-center justify-center gap-2 h-12 shadow-sm font-medium bg-base-100 text-base-content"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">
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

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isExecuting}
                  className="btn btn-primary w-full rounded-xl flex items-center justify-center gap-2 h-12 shadow-sm font-medium"
                >
                  {isExecuting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </div>

              <div className="text-center pt-4">
                <Link
                  href="/clinician-login"
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

export default ClinicianForgotPasswordPage;
