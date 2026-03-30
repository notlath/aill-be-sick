import Link from "next/link";
import { ArrowLeft, Mail, AlertCircle } from "lucide-react";

export default function SupportPage() {
  return (
    <main className="flex bg-base-200 min-h-screen">
      <section className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32 py-8">
        <div className="w-full max-w-lg mx-auto space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Need Help?
            </h1>
            <p className="text-muted text-lg">
              We&apos;re here to assist you.
            </p>
          </div>

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">
                    Contact Us
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    If you&apos;re having trouble logging into your account, please
                    visit the <strong>Bagong Silangan Barangay Health Center</strong>{" "}
                    where your account was created. Our staff will help you
                    resolve any login issues.
                  </p>
                </div>
              </div>

              <div className="divider my-2"></div>

              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-secondary shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">
                    Common Issues
                  </h2>
                  <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-4 space-y-1">
                    <li>Forgot your password — visit the health center to reset</li>
                    <li>Account not working — verify your account was created</li>
                    <li>Google sign-in not working — ensure you have an existing account</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/login"
            className="btn btn-outline w-full rounded-xl flex items-center justify-center gap-2 h-12 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
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
}
