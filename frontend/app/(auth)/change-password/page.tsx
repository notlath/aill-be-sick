"use client";

import { forceChangePassword } from "@/actions/force-change-password";
import {
  ResetPasswordSchema,
  ResetPasswordSchemaType,
} from "@/schemas/ResetPasswordSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { Loader2, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ChangePasswordPage = () => {
  const form = useForm<ResetPasswordSchemaType>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    resolver: zodResolver(ResetPasswordSchema),
  });

  const { execute: execUpdate, isExecuting } = useAction(forceChangePassword, {
    onSuccess: ({ data }) => {
      if (data?.error) {
        toast.error(data.error);
      }
      // On success, the action redirects to "/" automatically
    },
    onError: () => {
      toast.error("An unexpected error occurred. Please try again.");
    },
  });

  const handleUpdate = form.handleSubmit((formData) => {
    execUpdate(formData);
  });

  return (
    <main className="flex min-h-screen bg-base-200">
      {/* Left Column - Auth Form */}
      <section className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="space-y-3 text-center lg:text-left">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
              AI&apos;ll Be Sick
            </h1>
            <p className="text-muted text-lg">Set your new password</p>
          </div>

          <div className="bg-base-100 p-6 rounded-2xl border border-border space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <KeyRound className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-medium">Welcome to AI&apos;ll Be Sick</h2>
                <p className="text-sm text-muted">
                  Your clinician created this account with a temporary password.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted">
              Please choose a new password to continue. This helps keep your
              account secure.
            </p>
          </div>

          <form onSubmit={handleUpdate} className="space-y-5">
            <div className="space-y-2">
              <label
                className="text-sm font-medium leading-none"
                htmlFor="password"
              >
                New Password
              </label>
              <Input
                id="password"
                type="password"
                className="h-12"
                placeholder="Enter your new password"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <span className="text-error text-xs font-medium">
                  {form.formState.errors.password.message}
                </span>
              )}
              <p className="text-xs text-muted">
                Password must be at least 6 characters long.
              </p>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium leading-none"
                htmlFor="confirmPassword"
              >
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                className="h-12"
                placeholder="Confirm your new password"
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword && (
                <span className="text-error text-xs font-medium">
                  {form.formState.errors.confirmPassword.message}
                </span>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isExecuting}
                className="btn btn-primary w-full rounded-xl flex items-center justify-center gap-2 h-12 font-medium"
              >
                {isExecuting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Set Password and Continue"
                )}
              </button>
            </div>
          </form>
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

export default ChangePasswordPage;
