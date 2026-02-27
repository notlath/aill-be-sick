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
        console.error(data.error);
      } else {
        setSuccessMessage("Password reset link sent to your email.");
      }
    },
  });

  const handleReset = form.handleSubmit((formData) => {
    execReset(formData);
  });

  return (
    <main className="flex justify-center items-center h-screen">
      <section className="space-y-4 text-center max-w-md w-full">
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="font-bold text-3xl">Forgot Password?</h1>
            <p className="text-muted">
              Enter your email to receive a password reset link.
            </p>
          </div>
          <div className="space-y-4 bg-base-200 p-4 card-border border-border card">
            {successMessage ? (
              <div className="alert alert-success">
                <span>{successMessage}</span>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-1 text-left">
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="outline-none input w-full"
                    placeholder="Email"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <span className="text-error text-sm">
                      {form.formState.errors.email.message}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isExecuting}
                  className="btn btn-primary w-full mb-0"
                >
                  {isExecuting ? (
                    <span className="loading loading-spinner"></span>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>
            )}
            <div className="text-center mt-4">
              <Link href="/clinician-login" className="link link-hover text-sm">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ClinicianForgotPasswordPage;
