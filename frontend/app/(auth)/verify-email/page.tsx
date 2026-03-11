import Link from "next/link";
import { Mail } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <main className="flex bg-base-200 min-h-screen">
      <section className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md bg-base-100 rounded-3xl p-8 shadow-sm space-y-6 text-center border border-base-300">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-base-content">
              Check your email
            </h1>
            <p className="text-base-content/70">
              We've sent a verification link to your email address. Please check your inbox and click the link to verify your account before logging in.
            </p>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <Link href="/login" className="btn btn-primary w-full">
              Back to login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
