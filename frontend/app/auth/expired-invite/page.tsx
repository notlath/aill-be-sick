"use client";

import Link from "next/link";
import { Clock, Mail } from "lucide-react";
import { Suspense } from "react";

function ExpiredInviteContent() {
  return (
    <main className="flex min-h-screen bg-base-200">
      {/* Left Column - Error Content */}
      <section className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="space-y-3 text-center lg:text-left">
            <div className="flex justify-center lg:justify-start">
              <div className="rounded-full bg-warning/10 p-4">
                <Clock className="size-8 text-warning" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              Invitation Expired
            </h1>
            <p className="text-muted text-lg">
              This account invitation link has expired
            </p>
          </div>

          <div className="bg-base-100 p-6 rounded-2xl border border-border space-y-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-base-content">
                Why did this happen?
              </h3>
              <p className="text-sm text-muted">
                For security reasons, account invitation links expire after 24
                hours. If you received this link but didn't use it in time,
                you'll need a new invitation.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-base-content">
                What should you do?
              </h3>
              <p className="text-sm text-muted">
                Please return to Bagong Silangan Barangay Health Center and ask
                the staff to send you a new invitation link. They'll be happy to
                help you create your account.
              </p>
            </div>

            <div className="flex items-start gap-3 bg-info/10 p-3 rounded-xl">
              <Mail className="size-5 text-info shrink-0 mt-0.5" />
              <p className="text-sm text-info">
                <strong>Tip:</strong> Make sure to check your email regularly
                and click the invitation link within 24 hours of receiving it.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Link
              href="/login"
              className="btn btn-primary w-full rounded-xl flex items-center justify-center gap-2 h-12 shadow-sm font-medium"
            >
              Go to Login Page
            </Link>

            <p className="text-center text-sm text-muted">
              Need help? Visit the health center or contact support.
            </p>
          </div>
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
}

export default function ExpiredInvitePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-base-200">
          <div className="text-center">
            <div className="rounded-full bg-base-300 p-4 mb-4">
              <Clock className="size-8 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold">Loading...</h1>
          </div>
        </main>
      }
    >
      <ExpiredInviteContent />
    </Suspense>
  );
}
