"use client";

import { emailLogin, emailSignup } from "@/actions/email-auth";
import {
  EmailAuthSchema,
  EmailAuthSchemaType,
} from "@/schemas/EmailAuthSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";

const ClinicianLoginPage = () => {
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
        if (data.error) {
          console.error(data.error);
        }
      },
    }
  );
  const { execute: execSignup, isExecuting: isSigningUp } = useAction(
    emailSignup,
    {
      onSuccess: ({ data }) => {
        if (data.error) {
          console.error(data.error);
        }
      },
    }
  );

  const handleLogin = () => {
    const formData = form.getValues();

    execLogin(formData);
  };

  const handleSignup = () => {
    const formData = form.getValues();

    execSignup(formData);
  };

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
          <div className="space-y-4 bg-base-200 p-4 card-border border-border card">
            <div className="space-y-1 text-left">
              <label className="label">Email</label>
              <input
                type="email"
                className="outline-none input"
                placeholder="Email"
                {...form.register("email")}
              />
            </div>
            <div className="space-y-1 text-left">
              <label className="label">Password</label>
              <input
                type="password"
                className="outline-none input"
                placeholder="Password"
                {...form.register("password")}
              />
            </div>
            <div className="flex gap-2">
              <button
                disabled={isLoggingIn}
                onClick={handleLogin}
                className="flex-1 btn btn-primary"
              >
                {isLoggingIn ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  "Log in"
                )}
              </button>
              <button
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
          </div>
        </div>
      </section>
    </main>
  );
};

export default ClinicianLoginPage;
