import Link from "next/link";

export default function Unauthorized() {
  return (
    <main className="flex h-screen items-center justify-center">
      <section className="space-y-6 text-center max-w-md w-full px-4">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-error">401 Unauthorized</h1>
          <p className="text-muted">
            Please log in to continue accessing this page.
          </p>
        </div>
        <Link href="/login" className="btn btn-primary w-full">
          Return to Login
        </Link>
      </section>
    </main>
  );
}
