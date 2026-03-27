import Link from "next/link";
import { ArrowLeft, MapPin, Info } from "lucide-react";

export default function NeedAccountPage() {
  return (
    <main className="flex bg-base-200 min-h-screen">
      <section className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32 py-8">
        <div className="w-full max-w-lg mx-auto space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Need an Account?
            </h1>
            <p className="text-muted text-lg">
              We're here to help you get started.
            </p>
          </div>

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">
                    Visit Bagong Silangan Barangay Health Center
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    To create an account, please visit the{" "}
                    <strong>Bagong Silangan Barangay Health Center</strong>. Our
                    health staff will assist you in setting up your account and
                    getting started with the system.
                  </p>
                </div>
              </div>

              <div className="divider my-2"></div>

              <div className="flex items-start gap-3">
                <Info className="w-6 h-6 text-secondary shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">
                    Not from Bagong Silangan?
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We appreciate your interest in AI'll Be Sick! Currently,
                    this system only serves residents of{" "}
                    <strong>Barangay Bagong Silangan</strong>. Stay tuned — we
                    may expand to more areas in the future.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="alert alert-info">
            <Info className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              If you already have an account, you can{" "}
              <Link href="/login" className="link link-primary font-medium">
                sign in here
              </Link>
              .
            </p>
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
