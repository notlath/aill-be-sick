"use client";

import { updatePassword } from "@/actions/email-auth";
import {
  ResetPasswordSchema,
  ResetPasswordSchemaType,
} from "@/schemas/ResetPasswordSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { useState } from "react";
import Link from "next/link";

const ClinicianResetPasswordPage = () => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<ResetPasswordSchemaType>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    resolver: zodResolver(ResetPasswordSchema),
  });

  const { execute: execUpdate, isExecuting } = useAction(updatePassword, {
    onSuccess: ({ data }) => {
      if (data?.error) {
        console.error(data.error);
      } else {
        setSuccessMessage("Password updated successfully.");
      }
    },
  });

  const handleUpdate = form.handleSubmit((formData) => {
    execUpdate(formData);
  });

  return (
    <main className="flex justify-center items-center h-screen">
      <section className="space-y-4 text-center max-w-md w-full">
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="font-bold text-3xl">Reset Password</h1>
            <p className="text-muted">Enter your new password.</p>
          </div>
          <div className="space-y-4 bg-base-200 p-4 card-border border-border card">
            {successMessage ? (
              <div className="space-y-4">
                <div className="alert alert-success">
                  <span>{successMessage}</span>
                </div>
                <Link href="/clinician-login" className="btn btn-primary w-full">
                  Go to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-1 text-left">
                  <label className="label">New Password</label>
                  <input
                    type="password"
                    className="outline-none input w-full"
                    placeholder="New Password"
                    {...form.register("password")}
                  />
                  {form.formState.errors.password && (
                    <span className="text-error text-sm">
                      {form.formState.errors.password.message}
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-left">
                  <label className="label">Confirm Password</label>
                  <input
                    type="password"
                    className="outline-none input w-full"
                    placeholder="Confirm Password"
                    {...form.register("confirmPassword")}
                  />
                  {form.formState.errors.confirmPassword && (
                    <span className="text-error text-sm">
                      {form.formState.errors.confirmPassword.message}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isExecuting}
                  className="btn btn-primary w-full"
                >
                  {isExecuting ? (
                    <span className="loading loading-spinner"></span>
                  ) : (
                    "Update Password"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

export default ClinicianResetPasswordPage;
