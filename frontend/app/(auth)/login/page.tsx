"use client";

import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { patientLogin } from "@/actions/patient-auth";
import { accessCodeLogin } from "@/actions/access-code-auth";
import {
  EmailAuthSchema,
  EmailAuthSchemaType,
} from "@/schemas/EmailAuthSchema";
import {
  AccessCodeAuthSchema,
  AccessCodeAuthSchemaType,
} from "@/schemas/AccessCodeAuthSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowRight, Loader2, Info, Mail, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const HomePage = () => {
  // Email login form
  const emailForm = useForm<EmailAuthSchemaType>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(EmailAuthSchema),
  });

  // Access code login form
  const accessCodeForm = useForm<AccessCodeAuthSchemaType>({
    defaultValues: {
      accessCode: "",
      password: "",
    },
    resolver: zodResolver(AccessCodeAuthSchema),
  });

  const { execute: execEmailLogin, isExecuting: isEmailLoggingIn } = useAction(
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

  const { execute: execAccessCodeLogin, isExecuting: isAccessCodeLoggingIn } =
    useAction(accessCodeLogin, {
      onSuccess: ({ data }) => {
        if (data?.error) {
          toast.error(data.error);
        }
      },
      onError: () => {
        toast.error("An unexpected error occurred during login.");
      },
    });

  const handleEmailLogin = emailForm.handleSubmit((formData) => {
    execEmailLogin(formData);
  });

  const handleAccessCodeLogin = accessCodeForm.handleSubmit((formData) => {
    execAccessCodeLogin(formData);
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

          {/* Login Method Tabs */}
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger
                value="access-code"
                className="flex items-center gap-2"
              >
                <KeyRound className="h-4 w-4" />
                Access Code
              </TabsTrigger>
            </TabsList>

            {/* Email Login Form */}
            <TabsContent value="email">
              <form onSubmit={handleEmailLogin} className="space-y-5">
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
                    {...emailForm.register("email")}
                  />
                  {emailForm.formState.errors.email && (
                    <span className="text-error text-xs font-medium">
                      {emailForm.formState.errors.email.message}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium leading-none"
                    htmlFor="email-password"
                  >
                    Password
                  </label>
                  <Input
                    id="email-password"
                    type="password"
                    className="h-12"
                    placeholder="Enter your password"
                    {...emailForm.register("password")}
                  />
                  {emailForm.formState.errors.password && (
                    <span className="text-error text-xs font-medium">
                      {emailForm.formState.errors.password.message}
                    </span>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isEmailLoggingIn}
                    className="btn btn-primary w-full rounded-xl flex items-center justify-center gap-2 h-12 font-medium"
                  >
                    {isEmailLoggingIn ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Sign In <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </TabsContent>

            {/* Access Code Login Form */}
            <TabsContent value="access-code">
              <form onSubmit={handleAccessCodeLogin} className="space-y-5">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium leading-none"
                    htmlFor="access-code"
                  >
                    Access Code
                  </label>
                  <Input
                    id="access-code"
                    type="text"
                    className="h-12 font-mono uppercase tracking-wider"
                    placeholder="PAT-XXXXXX"
                    {...accessCodeForm.register("accessCode")}
                  />
                  {accessCodeForm.formState.errors.accessCode && (
                    <span className="text-error text-xs font-medium">
                      {accessCodeForm.formState.errors.accessCode.message}
                    </span>
                  )}
                  <p className="text-xs text-muted">
                    Your clinician provided this code when creating your
                    account.
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium leading-none"
                    htmlFor="access-code-password"
                  >
                    Password
                  </label>
                  <Input
                    id="access-code-password"
                    type="password"
                    className="h-12"
                    placeholder="Enter your password"
                    {...accessCodeForm.register("password")}
                  />
                  {accessCodeForm.formState.errors.password && (
                    <span className="text-error text-xs font-medium">
                      {accessCodeForm.formState.errors.password.message}
                    </span>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isAccessCodeLoggingIn}
                    className="btn btn-primary w-full rounded-xl flex items-center justify-center gap-2 h-12 font-medium"
                  >
                    {isAccessCodeLoggingIn ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Sign In <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </TabsContent>
          </Tabs>

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
